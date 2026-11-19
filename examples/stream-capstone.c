#define _GNU_SOURCE
#include "tcp-support.h"

int main(void)
{
    alarm(10);
    struct sockaddr_in address;
    int listener = listen_on(&address);
    int client = connect_to(&address);
    int server = accept_one(listener);

    const char request[] = "hello";
    uint32_t header = htonl(sizeof request - 1);
    send_all(client, &header, sizeof header);
    send_all(client, request, 2);
    char data[32];
    check(receive(server, &header, sizeof header) == sizeof header, "complete header");
    uint32_t length = ntohl(header);
    check(length > 2 && length <= sizeof data, "frame length");
    size_t first = receive(server, data, 2);
    check(first == 2, "first piece");

    send_all(client, request + 2, sizeof request - 3);
    check(shutdown(client, SHUT_WR) == 0, "end request stream");
    check(receive(server, data + first, length - first) == length - first, "rest of frame");
    char extra;
    check(recv(server, &extra, 1, 0) == 0, "EOF follows the frame");
    printf("assembled frame %u: %.*s, then EOF\n", (unsigned)length, (int)length, data);

    send_all(server, data, length);
    check(receive(client, data, length) == length && !memcmp(data, request, length),
          "client verifies reply after half-close");
    printf("client verified reply: %.*s\n", (int)length, data);

    close(server);
    close(client);
    close(listener);
    return 0;
}
