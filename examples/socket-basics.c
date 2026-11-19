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

int main(int argc, char **argv)
{
    alarm(10);
    if (argc == 2 && !strcmp(argv[1], "socket"))
        inspect_socket();
    else if (argc == 2 && !strcmp(argv[1], "datagram"))
        send_datagram();
    else if (argc == 2 && !strcmp(argv[1], "listen"))
        accept_stream();
    else {
        fputs("choose socket, datagram or listen\n", stderr);
        return 1;
    }
    return 0;
}
