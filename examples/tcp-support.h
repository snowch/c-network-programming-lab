#ifndef TCP_SUPPORT_H
#define TCP_SUPPORT_H

#include <arpa/inet.h>
#include <errno.h>
#include <netdb.h>
#include <poll.h>
#include <signal.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/epoll.h>
#include <sys/socket.h>
#include <sys/wait.h>
#include <unistd.h>

static inline void fail(const char *what)
{
    perror(what);
    exit(EXIT_FAILURE);
}

static inline void check(int condition, const char *what)
{
    if (!condition) {
        fprintf(stderr, "%s\n", what);
        exit(EXIT_FAILURE);
    }
}

static inline void send_all(int fd, const void *buffer, size_t length)
{
    const unsigned char *p = buffer;
    while (length) {
        ssize_t n = send(fd, p, length, MSG_NOSIGNAL);
        if (n < 0 && errno == EINTR)
            continue;
        if (n <= 0)
            fail("send");
        p += n;
        length -= (size_t)n;
    }
}

static inline size_t receive(int fd, void *buffer, size_t length)
{
    unsigned char *p = buffer;
    size_t received = 0;
    while (received < length) {
        ssize_t n = recv(fd, p + received, length - received, 0);
        if (n == 0)
            break;
        if (n < 0 && errno == EINTR)
            continue;
        if (n < 0)
            fail("recv");
        received += (size_t)n;
    }
    return received;
}

static inline int bound_socket(int type, struct sockaddr_in *address)
{
    int fd = socket(AF_INET, type | SOCK_CLOEXEC, 0);
    if (fd < 0)
        fail("socket");
    *address = (struct sockaddr_in){
        .sin_family = AF_INET, .sin_addr.s_addr = htonl(INADDR_LOOPBACK)
    };
    socklen_t size = sizeof *address;
    if (bind(fd, (struct sockaddr *)address, size) < 0 ||
        getsockname(fd, (struct sockaddr *)address, &size) < 0)
        fail("bind/getsockname");
    return fd;
}

static inline int connect_to(const struct sockaddr_in *address)
{
    int fd = socket(AF_INET, SOCK_STREAM | SOCK_CLOEXEC, 0);
    if (fd < 0 || connect(fd, (const struct sockaddr *)address, sizeof *address) < 0)
        fail("connect");
    return fd;
}

static inline int accept_one(int server)
{
    int fd = accept4(server, NULL, NULL, SOCK_CLOEXEC);
    if (fd < 0)
        fail("accept");
    return fd;
}

static inline int listen_on(struct sockaddr_in *address)
{
    int server = bound_socket(SOCK_STREAM, address);
    if (listen(server, SOMAXCONN) < 0)
        fail("listen");
    printf("listen 127.0.0.1:%u\n", (unsigned)ntohs(address->sin_port));
    return server;
}

#endif
