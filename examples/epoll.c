#define _GNU_SOURCE
#include "tcp-support.h"

enum { SPLIT = 2, PEERS = 2 };

static const char payload[] = "hello";

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

int main(void)
{
    alarm(10);
    multiplex();
    return 0;
}
