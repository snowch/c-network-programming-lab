#define _GNU_SOURCE
#include "tcp-support.h"

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

int main(void)
{
    alarm(10);
    backpressure();
    return 0;
}
