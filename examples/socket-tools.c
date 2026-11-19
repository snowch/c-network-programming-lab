#define _GNU_SOURCE
#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <linux/if_ether.h>
#include <linux/if_packet.h>
#include <net/if.h>
#include <netinet/ip.h>
#include <netinet/udp.h>
#include <poll.h>
#include <resolv.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <unistd.h>

enum { DEADLINE_MS = 200, DNS_TTL = 30, DNS_BUFFER = 512 };
static const char dns_name[] = "echo.lab.test";

static void require(int ok, const char *message)
{
    if (!ok) {
        perror(message);
        exit(EXIT_FAILURE);
    }
}

static void ready(int fd, short events)
{
    struct pollfd item = { .fd = fd, .events = events };
    require(poll(&item, 1, 2000) == 1, "poll deadline");
}

static int attach_ipv4(int type, struct sockaddr_in *address)
{
    int fd = socket(AF_INET, type | SOCK_CLOEXEC, 0);
    require(fd >= 0, "socket");
    *address = (struct sockaddr_in){
        .sin_family = AF_INET, .sin_addr.s_addr = htonl(INADDR_LOOPBACK)
    };
    socklen_t length = sizeof *address;
    require(bind(fd, (struct sockaddr *)address, length) == 0, "bind");
    require(getsockname(fd, (struct sockaddr *)address, &length) == 0, "getsockname");
    return fd;
}

static void connect_status(void)
{
    struct sockaddr_in address;
    const int accept_connections = 1;
    int endpoint = attach_ipv4(SOCK_STREAM, &address);
    if (accept_connections)
        require(listen(endpoint, 1) == 0, "listen");
    int client = socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK | SOCK_CLOEXEC, 0);
    require(client >= 0, "socket");
    int result = connect(client, (struct sockaddr *)&address, sizeof address);
    if (result < 0 && errno != EINPROGRESS)
        require(0, "connect");
    if (result < 0)
        ready(client, POLLOUT);
    int error = 0;
    socklen_t size = sizeof error;
    require(getsockopt(client, SOL_SOCKET, SO_ERROR, &error, &size) == 0, "SO_ERROR");
    printf("connect completion: %s\n", error == 0 ? "connected" : strerror(error));
    require(error == (accept_connections ? 0 : ECONNREFUSED), "unexpected connection outcome");
    close(client);
    close(endpoint);
}

static void ipv6_echo(void)
{
    int server = socket(AF_INET6, SOCK_DGRAM | SOCK_CLOEXEC, 0);
    int client = socket(AF_INET6, SOCK_DGRAM | SOCK_CLOEXEC, 0);
    require(server >= 0 && client >= 0, "IPv6 socket");
    struct sockaddr_in6 address = { .sin6_family = AF_INET6, .sin6_addr = IN6ADDR_LOOPBACK_INIT };
    socklen_t size = sizeof address;
    require(bind(server, (struct sockaddr *)&address, size) == 0, "IPv6 bind");
    require(getsockname(server, (struct sockaddr *)&address, &size) == 0, "getsockname");
    char payload = '6', response;
    require(sendto(client, &payload, 1, 0, (struct sockaddr *)&address, size) == 1, "sendto");
    struct sockaddr_in6 peer;
    size = sizeof peer;
    ready(server, POLLIN);
    require(recvfrom(server, &response, 1, 0, (struct sockaddr *)&peer, &size) == 1, "recvfrom server");
    require(sendto(server, &response, 1, 0, (struct sockaddr *)&peer, size) == 1, "send reply");
    ready(client, POLLIN);
    require(recv(client, &response, 1, 0) == 1 && response == payload, "verify IPv6 echo");
    char numeric[INET6_ADDRSTRLEN];
    require(inet_ntop(AF_INET6, &peer.sin6_addr, numeric, sizeof numeric) != NULL, "inet_ntop");
    printf("IPv6 peer [%s]:%u echoed %c\n", numeric, (unsigned)ntohs(peer.sin6_port), response);
    close(client);
    close(server);
}

static void descriptor_message(void)
{
    int channel[2], data[2];
    require(socketpair(AF_UNIX, SOCK_SEQPACKET | SOCK_CLOEXEC, 0, channel) == 0, "socketpair");
    require(pipe2(data, O_CLOEXEC) == 0, "pipe2");
    char payload = 'F';
    require(write(data[1], &payload, 1) == 1, "write to pipe");
    close(data[1]);
    union { struct cmsghdr align; char bytes[CMSG_SPACE(sizeof(int))]; } control = {0};
    struct iovec vector = { &payload, 1 };
    struct msghdr message = {
        .msg_iov = &vector, .msg_iovlen = 1,
        .msg_control = control.bytes, .msg_controllen = sizeof control.bytes
    };
    struct cmsghdr *header = CMSG_FIRSTHDR(&message);
    header->cmsg_level = SOL_SOCKET;
    header->cmsg_type = SCM_RIGHTS;
    header->cmsg_len = CMSG_LEN(sizeof(int));
    memcpy(CMSG_DATA(header), &data[0], sizeof data[0]);
    require(sendmsg(channel[0], &message, 0) == 1, "sendmsg");
    close(data[0]);

    memset(control.bytes, 0, sizeof control.bytes);
    payload = 0;
    require(recvmsg(channel[1], &message, MSG_CMSG_CLOEXEC) == 1 &&
            !(message.msg_flags & MSG_CTRUNC), "recvmsg");
    header = CMSG_FIRSTHDR(&message);
    require(header && header->cmsg_level == SOL_SOCKET && header->cmsg_type == SCM_RIGHTS &&
            header->cmsg_len == CMSG_LEN(sizeof(int)), "missing descriptor");
    int received;
    memcpy(&received, CMSG_DATA(header), sizeof received);
    char value;
    require(read(received, &value, 1) == 1 && value == 'F', "read received pipe");
    int flags = fcntl(received, F_GETFD);
    require(flags >= 0, "fcntl");
    printf("message %c, passed pipe read %c, close-on-exec=%d\n",
           payload, value, !!(flags & FD_CLOEXEC));
    close(received);
    close(channel[0]);
    close(channel[1]);
}

static void udp_deadline(void)
{
    struct sockaddr_in address;
    int server = attach_ipv4(SOCK_DGRAM, &address);
    int client = socket(AF_INET, SOCK_DGRAM | SOCK_CLOEXEC, 0);
    require(client >= 0 && connect(client, (struct sockaddr *)&address, sizeof address) == 0,
            "connect UDP");
    const int answer_first_attempt = 0;
    for (int attempt = 1; attempt <= 2; ++attempt) {
        unsigned char request = (unsigned char)attempt;
        require(send(client, &request, 1, 0) == 1, "request");
        struct sockaddr_in peer;
        socklen_t size = sizeof peer;
        ready(server, POLLIN);
        require(recvfrom(server, &request, 1, 0, (struct sockaddr *)&peer, &size) == 1,
                "receive request");
        if (attempt > 1 || answer_first_attempt)
            require(sendto(server, &request, 1, 0, (struct sockaddr *)&peer, size) == 1, "reply");
        struct pollfd incoming = { .fd = client, .events = POLLIN };
        int count = poll(&incoming, 1, DEADLINE_MS);
        require(count >= 0, "poll");
        if (!count) {
            printf("request %d timed out\n", attempt);
            continue;
        }
        unsigned char reply;
        require(recv(client, &reply, 1, 0) == 1 && reply == request, "match reply ID");
        printf("request %d got reply ID %u\n", attempt, reply);
        close(client);
        close(server);
        return;
    }
    require(0, "both requests timed out");
}

static void dns_reply(unsigned char buffer[DNS_BUFFER], size_t length, size_t *reply_size)
{
    char requested[256];
    int consumed = dn_expand(buffer, buffer + length, buffer + 12, requested, sizeof requested);
    require(consumed >= 0 && 12 + (size_t)consumed + 4 == length, "DNS question bounds");
    unsigned int found = !strcmp(requested, "echo.lab.test");
    buffer[2] = 0x81;                    /* Response, recursion desired copied. */
    buffer[3] = found ? 0x00 : 0x03;     /* Success or NXDOMAIN. */
    buffer[7] = (unsigned char)found;
    if (found) {
        const unsigned char record[] = {
            0xc0, 0x0c,                 /* Name pointer to the question. */
            0, 1, 0, 1,                 /* Type A, class IN. */
            0, 0, 0, DNS_TTL,           /* Time to live in network byte order. */
            0, 4, 127, 0, 0, 1
        };
        require(length + sizeof record <= DNS_BUFFER, "DNS answer bounds");
        memcpy(buffer + length, record, sizeof record);
        length += sizeof record;
    }
    *reply_size = length;
}

static void dns_exchange(void)
{
    struct sockaddr_in resolver;
    int server = attach_ipv4(SOCK_DGRAM, &resolver);
    int client = socket(AF_INET, SOCK_DGRAM | SOCK_CLOEXEC, 0);
    require(client >= 0 && connect(client, (struct sockaddr *)&resolver, sizeof resolver) == 0,
            "connect DNS socket");
    unsigned char wire[DNS_BUFFER];
    int query_size = res_mkquery(0, dns_name, 1, 1, NULL, 0, NULL, wire, sizeof wire);
    require(query_size >= 17, "make DNS query");
    const uint16_t transaction = (uint16_t)((wire[0] << 8) | wire[1]);
    require(send(client, wire, (size_t)query_size, 0) == query_size, "send query");
    ready(server, POLLIN);
    struct sockaddr_in from;
    socklen_t size = sizeof from;
    require(recvfrom(server, wire, sizeof wire, 0, (struct sockaddr *)&from, &size) == query_size,
            "receive query");
    size_t reply_size;
    dns_reply(wire, (size_t)query_size, &reply_size);
    require(sendto(server, wire, reply_size, 0, (struct sockaddr *)&from, size) == (ssize_t)reply_size,
            "send DNS answer");
    ready(client, POLLIN);
    ssize_t got = recv(client, wire, sizeof wire, 0);
    require(got >= query_size && ((wire[0] << 8) | wire[1]) == transaction && (wire[2] & 0x80),
            "match DNS transaction");
    unsigned int code = wire[3] & 15;
    if (code == 3) {
        printf("%s: NXDOMAIN\n", dns_name);
    } else {
        require(code == 0 && wire[7] == 1 && got == query_size + 16, "expected one A record");
        const unsigned char *answer = wire + query_size;
        char numeric[INET_ADDRSTRLEN];
        require(inet_ntop(AF_INET, answer + 12, numeric, sizeof numeric) != NULL, "format address");
        uint32_t ttl;
        memcpy(&ttl, answer + 6, sizeof ttl);
        printf("%s: A %s, TTL %u seconds\n", dns_name, numeric, (unsigned)ntohl(ttl));
    }
    close(client);
    close(server);
}

static void observe_packets(void)
{
    struct sockaddr_in endpoint;
    int receiver = attach_ipv4(SOCK_DGRAM, &endpoint);
    int capture = socket(AF_PACKET, SOCK_DGRAM | SOCK_CLOEXEC, htons(ETH_P_IP));
    require(capture >= 0, "packet socket");
    unsigned int loopback = if_nametoindex("lo");
    require(loopback != 0, "loopback interface");
    struct sockaddr_ll link = {
        .sll_family = AF_PACKET, .sll_protocol = htons(ETH_P_IP), .sll_ifindex = (int)loopback
    };
    require(bind(capture, (struct sockaddr *)&link, sizeof link) == 0, "bind packet socket");
    int sender = socket(AF_INET, SOCK_DGRAM | SOCK_CLOEXEC, 0);
    static const char payload[] = "capture";
    require(sender >= 0 && sendto(sender, payload, sizeof payload - 1, 0,
            (struct sockaddr *)&endpoint, sizeof endpoint) == sizeof payload - 1, "send datagram");
    for (;;) {
        unsigned char bytes[128];
        ready(capture, POLLIN);
        ssize_t n = recv(capture, bytes, sizeof bytes, 0);
        require(n >= 0, "recv packet");
        if (n < (ssize_t)sizeof(struct iphdr))
            continue;
        struct iphdr ip;
        memcpy(&ip, bytes, sizeof ip);
        size_t offset = ip.ihl * 4u;
        struct udphdr udp;
        if (ip.version != 4 || ip.protocol != IPPROTO_UDP ||
            offset < sizeof ip || offset + sizeof udp > (size_t)n)
            continue;
        memcpy(&udp, bytes + offset, sizeof udp);
        if (udp.dest != endpoint.sin_port)
            continue;
        printf("loopback IPv4 total=%u bytes, UDP total=%u bytes, payload=%zu bytes\n",
               (unsigned)ntohs(ip.tot_len), (unsigned)ntohs(udp.len),
               (size_t)ntohs(udp.len) - sizeof udp);
        break;
    }
    close(sender);
    close(capture);
    close(receiver);
}

int main(int argc, char **argv)
{
    alarm(15);
    const struct { const char *name; void (*run)(void); } modes[] = {
        { "connect", connect_status }, { "ipv6", ipv6_echo }, { "unix", descriptor_message },
        { "deadline", udp_deadline }, { "dns", dns_exchange }, { "packet", observe_packets }
    };
    for (size_t i = 0; argc == 2 && i < sizeof modes / sizeof *modes; ++i) {
        if (!strcmp(argv[1], modes[i].name)) {
            modes[i].run();
            return 0;
        }
    }
    fputs("choose connect, ipv6, unix, deadline, dns or packet\n", stderr);
    return 1;
}
