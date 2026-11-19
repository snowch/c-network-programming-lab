#ifndef SOCKET_SUPPORT_H
#define SOCKET_SUPPORT_H

#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <linux/if_ether.h>
#include <linux/if_packet.h>
#include <net/if.h>
#include <netinet/ip.h>
#include <netinet/udp.h>
#include <poll.h>
#include <resolv.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <unistd.h>

static inline void require(int ok, const char *message)
{
    if (!ok) {
        perror(message);
        exit(EXIT_FAILURE);
    }
}

static inline void ready(int fd, short events)
{
    struct pollfd item = { .fd = fd, .events = events };
    require(poll(&item, 1, 2000) == 1, "poll deadline");
}

static inline int attach_ipv4(int type, struct sockaddr_in *address)
{
    int fd = socket(AF_INET, type | SOCK_CLOEXEC, 0);
    require(fd >= 0, "socket");
    *address = (struct sockaddr_in){
        .sin_family = AF_INET, .sin_addr.s_addr = htonl(INADDR_LOOPBACK)
    };
    socklen_t length = sizeof *address;
    require(bind(fd, (struct sockaddr *)address, length) == 0, "bind");
    require(getsockname(fd, (struct sockaddr *)address, &length) == 0, "getsockname");
    return fd;
}

#endif
