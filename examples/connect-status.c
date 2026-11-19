#define _GNU_SOURCE
#include "socket-support.h"

static void connect_status(void)
{
    struct sockaddr_in address;
    const int accept_connections = 1;
    int endpoint = attach_ipv4(SOCK_STREAM, &address);
    if (accept_connections)
        require(listen(endpoint, 1) == 0, "listen");
    int client = socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK | SOCK_CLOEXEC, 0);
    require(client >= 0, "socket");
    int result = connect(client, (struct sockaddr *)&address, sizeof address);
    if (result < 0 && errno != EINPROGRESS)
        require(0, "connect");
    if (result < 0)
        ready(client, POLLOUT);
    int error = 0;
    socklen_t size = sizeof error;
    require(getsockopt(client, SOL_SOCKET, SO_ERROR, &error, &size) == 0, "SO_ERROR");
    printf("connect completion: %s\n", error == 0 ? "connected" : strerror(error));
    require(error == (accept_connections ? 0 : ECONNREFUSED), "unexpected connection outcome");
    close(client);
    close(endpoint);
}

int main(void)
{
    alarm(15);
    connect_status();
    return 0;
}
