#define _GNU_SOURCE
#include "tcp-support.h"

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

int main(void)
{
    alarm(10);
    addresses();
    return 0;
}
