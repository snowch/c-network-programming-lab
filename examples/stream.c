#define _GNU_SOURCE
#include "tcp-support.h"

enum { SPLIT = 2 };

static const char payload[] = "hello";

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

int main(void)
{
    alarm(10);
    stream();
    return 0;
}
