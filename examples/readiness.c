#define _GNU_SOURCE
#include "tcp-support.h"

enum { SPLIT = 2, TIMEOUT_MS = 40 };

static const char payload[] = "hello";

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

int main(void)
{
    alarm(10);
    readiness();
    return 0;
}
