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

static void accept_stream(void)
{
    struct sockaddr_in address;
    int listening = bind_loopback(SOCK_STREAM, 0, &address);
    require(listen(listening, 1) == 0, "listen");
    int client = socket(AF_INET, SOCK_STREAM | SOCK_CLOEXEC, 0);
    require(client >= 0 &&
            connect(client, (struct sockaddr *)&address, sizeof address) == 0, "connect");
    int connection = accept(listening, NULL, NULL);
    require(connection >= 0, "accept");
    printf("listening descriptor=%d, connected descriptor=%d\n", listening, connection);
    close(listening);
    const char payload = 'A';
    require(send(client, &payload, 1, 0) == 1, "send");
    char reply;
    require(recv(connection, &reply, 1, 0) == 1 && reply == payload, "recv");
    printf("accepted connection received %c after closing the listening socket\n", reply);
    close(connection);
    close(client);
}

int main(void)
{
    accept_stream();
    return 0;
}
