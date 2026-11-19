#define _GNU_SOURCE
#include "tcp-support.h"

enum { LIMIT = 64 };

static const char payload[] = "hello";

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

int main(void)
{
    alarm(10);
    half_close();
    return 0;
}
