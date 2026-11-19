#define _POSIX_C_SOURCE 200809L
#include <arpa/inet.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <unistd.h>

static void require(int ok, const char *operation)
{
    if (!ok) {
        perror(operation);
        exit(EXIT_FAILURE);
    }
}

static struct sockaddr_in endpoint(unsigned short port)
{
    struct sockaddr_in address = { .sin_family = AF_INET, .sin_port = htons(port) };
    require(inet_pton(AF_INET, "127.0.0.1", &address.sin_addr) == 1, "inet_pton");
    return address;
}

static int bind_loopback(int type, unsigned short port, struct sockaddr_in *address)
{
    int fd = socket(AF_INET, type | SOCK_CLOEXEC, 0);
    require(fd >= 0, "socket");
    *address = endpoint(port);
    require(bind(fd, (struct sockaddr *)address, sizeof *address) == 0, "bind");
    socklen_t length = sizeof *address;
    require(getsockname(fd, (struct sockaddr *)address, &length) == 0, "getsockname");
    return fd;
}

static void inspect_socket(void)
{
    struct sockaddr_in address;
    const unsigned short requested_port = 0;
    int fd = bind_loopback(SOCK_DGRAM, requested_port, &address);
    char host[INET_ADDRSTRLEN];
    require(inet_ntop(AF_INET, &address.sin_addr, host, sizeof host) != NULL, "inet_ntop");
    printf("socket returned descriptor %d\n", fd);
    printf("requested port %u, bound to %s:%u\n",
           (unsigned)requested_port, host, (unsigned)ntohs(address.sin_port));
    require(close(fd) == 0, "close");
}

int main(void)
{
    inspect_socket();
    return 0;
}
