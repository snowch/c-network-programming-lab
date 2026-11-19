#define _GNU_SOURCE
#include "socket-support.h"

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

int main(void)
{
    alarm(15);
    ipv6_echo();
    return 0;
}
