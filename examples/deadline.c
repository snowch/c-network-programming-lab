#define _GNU_SOURCE
#include "socket-support.h"

enum { DEADLINE_MS = 200 };

static void udp_deadline(void)
{
    struct sockaddr_in address;
    int server = attach_ipv4(SOCK_DGRAM, &address);
    int client = socket(AF_INET, SOCK_DGRAM | SOCK_CLOEXEC, 0);
    require(client >= 0 && connect(client, (struct sockaddr *)&address, sizeof address) == 0,
            "connect UDP");
    const int answer_first_attempt = 0;
    for (int attempt = 1; attempt <= 2; ++attempt) {
        unsigned char request = (unsigned char)attempt;
        require(send(client, &request, 1, 0) == 1, "request");
        struct sockaddr_in peer;
        socklen_t size = sizeof peer;
        ready(server, POLLIN);
        require(recvfrom(server, &request, 1, 0, (struct sockaddr *)&peer, &size) == 1,
                "receive request");
        if (attempt > 1 || answer_first_attempt)
            require(sendto(server, &request, 1, 0, (struct sockaddr *)&peer, size) == 1, "reply");
        struct pollfd incoming = { .fd = client, .events = POLLIN };
        int count = poll(&incoming, 1, DEADLINE_MS);
        require(count >= 0, "poll");
        if (!count) {
            printf("request %d timed out\n", attempt);
            continue;
        }
        unsigned char reply;
        require(recv(client, &reply, 1, 0) == 1 && reply == request, "match reply ID");
        printf("request %d got reply ID %u\n", attempt, reply);
        close(client);
        close(server);
        return;
    }
    require(0, "both requests timed out");
}

int main(void)
{
    alarm(15);
    udp_deadline();
    return 0;
}
