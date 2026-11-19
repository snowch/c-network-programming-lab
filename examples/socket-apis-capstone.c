#define _GNU_SOURCE
#include "socket-support.h"

int main(void)
{
    alarm(10);
    int server = socket(AF_INET, SOCK_DGRAM, 0);
    int client = socket(AF_INET, SOCK_DGRAM, 0);
    require(server >= 0 && client >= 0, "create sockets");

    struct sockaddr_in address = {
        .sin_family = AF_INET, .sin_addr.s_addr = htonl(INADDR_LOOPBACK)
    };
    socklen_t length = sizeof address;
    require(bind(server, (struct sockaddr *)&address, length) == 0, "bind");
    require(getsockname(server, (struct sockaddr *)&address, &length) == 0, "getsockname");
    printf("server bound to 127.0.0.1:%u\n", (unsigned)ntohs(address.sin_port));

    const char request[] = "ping";
    require(sendto(client, request, sizeof request - 1, 0,
                   (struct sockaddr *)&address, length) == sizeof request - 1, "send request");
    char data[32];
    struct sockaddr_in sender;
    socklen_t sender_length = sizeof sender;
    ssize_t received = recvfrom(server, data, sizeof data, 0,
                                (struct sockaddr *)&sender, &sender_length);
    require(received == sizeof request - 1 && !memcmp(data, request, sizeof request - 1),
            "receive request");
    printf("server received %.*s from port %u\n", (int)received, data, (unsigned)ntohs(sender.sin_port));

    const char reply[] = "pong";
    require(sendto(server, reply, sizeof reply - 1, 0,
                   (struct sockaddr *)&sender, sender_length) == sizeof reply - 1, "send reply");
    struct sockaddr_in responder;
    socklen_t responder_length = sizeof responder;
    received = recvfrom(client, data, sizeof data, 0, (struct sockaddr *)&responder, &responder_length);
    require(received == sizeof reply - 1 && !memcmp(data, reply, sizeof reply - 1) &&
            responder.sin_port == address.sin_port && responder.sin_addr.s_addr == address.sin_addr.s_addr,
            "verify reply and sender");
    printf("client verified %.*s from the server\n", (int)received, data);

    close(client);
    close(server);
    return 0;
}
