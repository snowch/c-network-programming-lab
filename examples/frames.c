#define _GNU_SOURCE
#include "tcp-support.h"

enum { LIMIT = 64 };

static const char payload[] = "hello";

static void send_frame(int fd, const char *data, uint32_t length)
{
    uint32_t header = htonl(length);
    send_all(fd, &header, sizeof header);
    send_all(fd, data, length);
}

static void framing(void)
{
    struct sockaddr_in address;
    int server = listen_on(&address);
    int client = connect_to(&address);
    int peer = accept_one(server);
    send_frame(client, payload, sizeof payload - 1);
    send_frame(client, "bye", 3);
    shutdown(client, SHUT_WR);
    for (;;) {
        uint32_t header;
        size_t n = receive(peer, &header, sizeof header);
        if (n == 0)
            break;
        check(n == sizeof header, "truncated length field");
        uint32_t length = ntohl(header);
        check(length <= LIMIT, "frame too large");
        char frame[LIMIT];
        check(receive(peer, frame, length) == length, "truncated frame");
        printf("frame %u: %.*s\n", (unsigned)length, (int)length, frame);
    }
    puts("clean EOF between frames");
    close(peer);
    close(client);
    close(server);
}

int main(void)
{
    alarm(10);
    framing();
    return 0;
}
