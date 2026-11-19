#define _GNU_SOURCE
#include <arpa/inet.h>
#include <errno.h>
#include <netdb.h>
#include <poll.h>
#include <signal.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/epoll.h>
#include <sys/socket.h>
#include <sys/wait.h>
#include <unistd.h>

static const char payload[] = "hello";
enum { SPLIT = 2, LIMIT = 64, PEERS = 2, TIMEOUT_MS = 40 };

static void fail(const char *what)
{
    perror(what);
    exit(EXIT_FAILURE);
}

static void check(int condition, const char *what)
{
    if (!condition) {
        fprintf(stderr, "%s\n", what);
        exit(EXIT_FAILURE);
    }
}

static void send_all(int fd, const void *buffer, size_t length)
{
    const unsigned char *p = buffer;
    while (length) {
        ssize_t n = send(fd, p, length, MSG_NOSIGNAL);
        if (n < 0 && errno == EINTR)
            continue;
        if (n <= 0)
            fail("send");
        p += n;
        length -= (size_t)n;
    }
}

/* Returns the bytes read. EOF may arrive before length. */
static size_t receive(int fd, void *buffer, size_t length)
{
    unsigned char *p = buffer;
    size_t received = 0;
    while (received < length) {
        ssize_t n = recv(fd, p + received, length - received, 0);
        if (n == 0)
            break;
        if (n < 0 && errno == EINTR)
            continue;
        if (n < 0)
            fail("recv");
        received += (size_t)n;
    }
    return received;
}

static int bound_socket(int type, struct sockaddr_in *address)
{
    int fd = socket(AF_INET, type | SOCK_CLOEXEC, 0);
    if (fd < 0)
        fail("socket");
    *address = (struct sockaddr_in){
        .sin_family = AF_INET, .sin_addr.s_addr = htonl(INADDR_LOOPBACK)
    };
    socklen_t size = sizeof *address;
    if (bind(fd, (struct sockaddr *)address, size) < 0 ||
        getsockname(fd, (struct sockaddr *)address, &size) < 0)
        fail("bind/getsockname");
    return fd;
}

static int connect_to(const struct sockaddr_in *address)
{
    int fd = socket(AF_INET, SOCK_STREAM | SOCK_CLOEXEC, 0);
    if (fd < 0 || connect(fd, (const struct sockaddr *)address, sizeof *address) < 0)
        fail("connect");
    return fd;
}

static int accept_one(int server)
{
    int fd = accept4(server, NULL, NULL, SOCK_CLOEXEC);
    if (fd < 0)
        fail("accept");
    return fd;
}

static int listen_on(struct sockaddr_in *address)
{
    int server = bound_socket(SOCK_STREAM, address);
    if (listen(server, SOMAXCONN) < 0)
        fail("listen");
    printf("listen 127.0.0.1:%u\n", (unsigned)ntohs(address->sin_port));
    return server;
}

static void stream(void)
{
    struct sockaddr_in address;
    int server = listen_on(&address);
    int client = connect_to(&address);
    int peer = accept_one(server);
    char data[sizeof payload - 1];
    send_all(client, payload, SPLIT);
    ssize_t first = recv(peer, data, sizeof data, 0);
    if (first <= 0)
        fail("first recv");
    /* Only issue the second write once the first read has returned. */
    send_all(client, payload + SPLIT, sizeof data - SPLIT);
    size_t rest = receive(peer, data + first, sizeof data - (size_t)first);
    check((size_t)first + rest == sizeof data, "unexpected EOF");
    send_all(peer, data, sizeof data);
    check(receive(client, data, sizeof data) == sizeof data, "incomplete echo");
    printf("first recv: %zd of %zu bytes\necho: %.*s\n",
           first, sizeof data, (int)sizeof data, data);
    close(peer);
    close(client);
    close(server);
}

static void send_frame(int fd, const char *data, uint32_t length)
{
    uint32_t header = htonl(length);
    send_all(fd, &header, sizeof header);
    send_all(fd, data, length);
}

static void framing(void)
{
    struct sockaddr_in address;
    int server = listen_on(&address);
    int client = connect_to(&address);
    int peer = accept_one(server);
    send_frame(client, payload, sizeof payload - 1);
    send_frame(client, "bye", 3);
    shutdown(client, SHUT_WR);
    for (;;) {
        uint32_t header;
        size_t n = receive(peer, &header, sizeof header);
        if (n == 0)
            break;
        check(n == sizeof header, "truncated length field");
        uint32_t length = ntohl(header);
        check(length <= LIMIT, "frame too large");
        char frame[LIMIT];
        check(receive(peer, frame, length) == length, "truncated frame");
        printf("frame %u: %.*s\n", (unsigned)length, (int)length, frame);
    }
    puts("clean EOF between frames");
    close(peer);
    close(client);
    close(server);
}

static void half_close(void)
{
    struct sockaddr_in address;
    int server = listen_on(&address);
    int client = connect_to(&address);
    int peer = accept_one(server);
    send_all(client, payload, sizeof payload - 1);
    if (shutdown(client, SHUT_WR) < 0)
        fail("shutdown");
    char data[LIMIT];
    size_t request = receive(peer, data, sizeof data);
    printf("server read %zu bytes followed by EOF\n", request);
    send_all(peer, "ok", 2);
    shutdown(peer, SHUT_WR);
    ssize_t n = recv(client, data, sizeof data, 0);
    if (n < 0)
        fail("client recv");
    printf("client still receives: %.*s\n", (int)n, data);
    close(peer);
    close(client);
    close(server);
}

static void udp(void)
{
    struct sockaddr_in address;
    int receiver = bound_socket(SOCK_DGRAM, &address);
    int sender = socket(AF_INET, SOCK_DGRAM | SOCK_CLOEXEC, 0);
    if (sender < 0)
        fail("udp socket");
    for (int i = 0; i < PEERS; ++i)
        if (sendto(sender, payload, sizeof payload - 1, 0,
                   (struct sockaddr *)&address, sizeof address) < 0)
            fail("sendto");
    char data[SPLIT];
    struct iovec buffer = { .iov_base = data, .iov_len = sizeof data };
    for (int i = 0; i < PEERS; ++i) {
        struct msghdr message = { .msg_iov = &buffer, .msg_iovlen = 1 };
        ssize_t n = recvmsg(receiver, &message, 0);
        if (n < 0)
            fail("recvmsg");
        printf("datagram %d: %zd copied, truncated=%d, bytes=%.*s\n",
               i + 1, n, !!(message.msg_flags & MSG_TRUNC), (int)n, data);
    }
    close(sender);
    close(receiver);
}

static void addresses(void)
{
    struct addrinfo hints = {
        .ai_family = AF_UNSPEC, .ai_socktype = SOCK_STREAM,
        .ai_flags = AI_NUMERICSERV
    };
    struct addrinfo *result;
    int status = getaddrinfo("localhost", "8080", &hints, &result);
    check(status == 0, gai_strerror(status));
    for (const struct addrinfo *it = result; it; it = it->ai_next) {
        char host[NI_MAXHOST], port[NI_MAXSERV];
        status = getnameinfo(it->ai_addr, it->ai_addrlen, host, sizeof host,
                             port, sizeof port, NI_NUMERICHOST | NI_NUMERICSERV);
        check(status == 0, gai_strerror(status));
        printf("%s [%s]:%s\n", it->ai_family == AF_INET6 ? "IPv6" : "IPv4", host, port);
    }
    freeaddrinfo(result);
}

static void readiness(void)
{
    struct sockaddr_in address;
    int server = listen_on(&address);
    int client = connect_to(&address);
    int peer = accept_one(server);
    char data[SPLIT];
    ssize_t n = recv(peer, data, sizeof data, MSG_DONTWAIT);
    check(n < 0 && (errno == EAGAIN || errno == EWOULDBLOCK), "expected EAGAIN");
    puts("nonblocking recv: EAGAIN");
    struct pollfd item = { .fd = peer, .events = POLLIN };
    int ready = poll(&item, 1, TIMEOUT_MS);
    check(ready == 0, "expected poll timeout");
    printf("idle poll: %d\n", ready);
    send_all(client, payload, sizeof payload - 1);
    ready = poll(&item, 1, TIMEOUT_MS);
    check(ready == 1 && (item.revents & POLLIN), "expected readable socket");
    n = recv(peer, data, sizeof data, MSG_DONTWAIT);
    if (n < 0)
        fail("ready recv");
    printf("readable poll: %d, recv copied %zd bytes\n", ready, n);
    close(peer);
    close(client);
    close(server);
}

/* Level-triggered readiness remains visible while a socket has unread bytes. */
static void multiplex(void)
{
    struct sockaddr_in address;
    int server = listen_on(&address);
    int queue = epoll_create1(EPOLL_CLOEXEC);
    if (queue < 0)
        fail("epoll_create1");
    int clients[PEERS], peers[PEERS];
    for (int i = 0; i < PEERS; ++i) {
        clients[i] = connect_to(&address);
        peers[i] = accept_one(server);
        struct epoll_event watch = { .events = EPOLLIN, .data.u32 = (uint32_t)i };
        if (epoll_ctl(queue, EPOLL_CTL_ADD, peers[i], &watch) < 0)
            fail("epoll_ctl");
    }
    for (int i = PEERS - 1; i >= 0; --i)
        send_all(clients[i], payload, sizeof payload - 1);
    unsigned done = 0;
    size_t echoed[PEERS] = {0};
    while (done < PEERS) {
        struct epoll_event events[PEERS];
        int count = epoll_wait(queue, events, PEERS, 1000);
        check(count > 0, "epoll timed out");
        for (int j = 0; j < count; ++j) {
            unsigned i = events[j].data.u32;
            char part[SPLIT];
            ssize_t n = recv(peers[i], part, sizeof part, MSG_DONTWAIT);
            if (n < 0 && (errno == EAGAIN || errno == EWOULDBLOCK))
                continue;
            check(n > 0, "peer closed before complete message");
            send_all(peers[i], part, (size_t)n);
            echoed[i] += (size_t)n;
            printf("peer %u: %zd bytes, total %zu\n", i, n, echoed[i]);
            if (echoed[i] == sizeof payload - 1) {
                close(peers[i]);
                ++done;
            }
        }
    }
    for (int i = 0; i < PEERS; ++i) {
        char data[sizeof payload - 1];
        check(receive(clients[i], data, sizeof data) == sizeof data &&
              !memcmp(data, payload, sizeof data), "echo mismatch");
        close(clients[i]);
    }
    printf("verified %d independent echoes\n", PEERS);
    close(queue);
    close(server);
}

static void backpressure(void)
{
    struct sockaddr_in address;
    int server = listen_on(&address);
    int client = connect_to(&address);
    int peer = accept_one(server);
    int capacity = 4096;
    if (setsockopt(client, SOL_SOCKET, SO_SNDBUF, &capacity, sizeof capacity) < 0)
        fail("setsockopt");
    char data[4096] = {0};
    size_t queued = 0;
    /* The peer deliberately does not read while the sender fills its queue. */
    for (;;) {
        ssize_t n = send(client, data, sizeof data, MSG_DONTWAIT | MSG_NOSIGNAL);
        if (n < 0 && (errno == EAGAIN || errno == EWOULDBLOCK))
            break;
        if (n <= 0)
            fail("nonblocking send");
        queued += (size_t)n;
        check(queued < 4 * 1024 * 1024, "send buffer did not apply backpressure");
    }
    printf("sender reached EAGAIN after %zu bytes\n", queued);
    size_t drained = 0;
    while (drained < queued) {
        size_t wanted = queued - drained;
        if (wanted > sizeof data)
            wanted = sizeof data;
        size_t n = receive(peer, data, wanted);
        check(n == wanted, "short drain");
        drained += n;
    }
    struct pollfd watch = { .fd = client, .events = POLLOUT };
    check(poll(&watch, 1, 1000) == 1 && (watch.revents & POLLOUT), "expected writable");
    check(send(client, "!", 1, MSG_DONTWAIT | MSG_NOSIGNAL) == 1, "retry send");
    check(receive(peer, data, 1) == 1 && data[0] == '!', "retry receive");
    printf("peer drained %zu bytes, then received a new byte\n", drained);
    close(peer);
    close(client);
    close(server);
}

static void echo_frames(int peer)
{
    for (;;) {
        uint32_t header;
        size_t n = receive(peer, &header, sizeof header);
        if (!n)
            return;
        check(n == sizeof header, "truncated header");
        uint32_t length = ntohl(header);
        check(length <= LIMIT, "oversized frame");
        char frame[LIMIT];
        check(receive(peer, frame, length) == length, "truncated frame");
        send_frame(peer, frame, length);
    }
}

static void framed_session(void)
{
    struct sockaddr_in address;
    int server = listen_on(&address);
    fflush(stdout);
    pid_t child = fork();
    if (child < 0)
        fail("fork");
    if (child == 0) {
        alarm(10);
        for (int i = 0; i < PEERS; ++i) {
            int peer = accept_one(server);
            echo_frames(peer);
            close(peer);
        }
        close(server);
        _exit(0);
    }
    close(server);
    for (int i = 0; i < PEERS; ++i) {
        int client = connect_to(&address);
        send_frame(client, payload, sizeof payload - 1);
        send_frame(client, "", 0);
        check(shutdown(client, SHUT_WR) == 0, "half close");
        uint32_t header;
        char echoed[sizeof payload - 1];
        check(receive(client, &header, sizeof header) == sizeof header &&
              ntohl(header) == sizeof echoed, "echo header");
        check(receive(client, echoed, sizeof echoed) == sizeof echoed &&
              !memcmp(echoed, payload, sizeof echoed), "echo payload");
        check(receive(client, &header, sizeof header) == sizeof header &&
              ntohl(header) == 0, "empty frame");
        check(receive(client, echoed, 1) == 0, "echo session did not close");
        printf("client %d verified text, empty frame and EOF\n", i + 1);
        close(client);
    }
    int status;
    check(waitpid(child, &status, 0) == child && WIFEXITED(status) &&
          WEXITSTATUS(status) == 0, "server exit status");
    puts("server process reaped");
}

int main(int argc, char **argv)
{
    alarm(10);
    const struct { const char *mode; void (*run)(void); } labs[] = {
        { "stream", stream }, { "frames", framing }, { "half-close", half_close },
        { "udp", udp }, { "addresses", addresses }, { "readiness", readiness },
        { "epoll", multiplex }, { "backpressure", backpressure }, { "capstone", framed_session }
    };
    for (size_t i = 0; argc == 2 && i < sizeof labs / sizeof *labs; ++i) {
        if (!strcmp(argv[1], labs[i].mode)) {
            labs[i].run();
            return EXIT_SUCCESS;
        }
    }
    fprintf(stderr, "usage: %s stream|frames|half-close|udp|addresses|readiness|epoll|backpressure|capstone\n", argv[0]);
    return EXIT_FAILURE;
}
