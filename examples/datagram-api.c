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

static void send_datagram(void)
{
    struct sockaddr_in receiver;
    int destination = bind_loopback(SOCK_DGRAM, 0, &receiver);
    int source = socket(AF_INET, SOCK_DGRAM | SOCK_CLOEXEC, 0);
    require(source >= 0, "socket");
    const char message[] = "ping";
    require(sendto(source, message, sizeof message - 1, 0, (struct sockaddr *)&receiver,
                   sizeof receiver) == sizeof message - 1, "sendto");
    char bytes[32];
    struct sockaddr_in sender;
    socklen_t length = sizeof sender;
    ssize_t count = recvfrom(destination, bytes, sizeof bytes, 0,
                             (struct sockaddr *)&sender, &length);
    require(count >= 0, "recvfrom");
    printf("received %zd bytes from port %u: %.*s\n",
           count, (unsigned)ntohs(sender.sin_port), (int)count, bytes);
    close(source);
    close(destination);
}

int main(void)
{
    send_datagram();
    return 0;
}
