#define _GNU_SOURCE
#include "socket-support.h"
#include <netdb.h>

int main(void)
{
    alarm(10);
    struct addrinfo hints = {
        .ai_family = AF_INET6, .ai_socktype = SOCK_DGRAM, .ai_flags = AI_NUMERICSERV
    };
    struct addrinfo *resolved;
    const char host[] = "localhost";
    int result = getaddrinfo(host, "0", &hints, &resolved);
    if (result != 0) {
        fprintf(stderr, "%s: %s\n", host, gai_strerror(result));
        return 1;
    }
    struct sockaddr_in6 destination;
    require(resolved->ai_addrlen == sizeof destination, "IPv6 address size");
    memcpy(&destination, resolved->ai_addr, sizeof destination);
    require(IN6_IS_ADDR_LOOPBACK(&destination.sin6_addr), "local loopback address");
    int receiver = socket(resolved->ai_family, resolved->ai_socktype, resolved->ai_protocol);
    int sender = socket(resolved->ai_family, resolved->ai_socktype, resolved->ai_protocol);
    freeaddrinfo(resolved);

    socklen_t length = sizeof destination;
    require(receiver >= 0 && sender >= 0 &&
            bind(receiver, (struct sockaddr *)&destination, length) == 0, "bind resolved address");
    require(getsockname(receiver, (struct sockaddr *)&destination, &length) == 0, "getsockname");
    char numeric[NI_MAXHOST], service[NI_MAXSERV];
    require(getnameinfo((struct sockaddr *)&destination, length, numeric, sizeof numeric,
                        service, sizeof service, NI_NUMERICHOST | NI_NUMERICSERV) == 0, "getnameinfo");
    printf("%s resolved to [%s], bound port %s\n", host, numeric, service);

    char byte = 'R';
    require(sendto(sender, &byte, 1, 0, (struct sockaddr *)&destination, length) == 1, "send");
    struct sockaddr_in6 peer;
    length = sizeof peer;
    byte = 0;
    require(recvfrom(receiver, &byte, 1, 0, (struct sockaddr *)&peer, &length) == 1 &&
            IN6_IS_ADDR_LOOPBACK(&peer.sin6_addr) && byte == 'R', "receive from IPv6 loopback");
    printf("received %c from IPv6 loopback\n", byte);
    close(sender);
    close(receiver);
    return 0;
}
