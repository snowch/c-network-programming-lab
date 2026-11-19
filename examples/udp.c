#define _GNU_SOURCE
#include "tcp-support.h"

enum { SPLIT = 2, PEERS = 2 };

static const char payload[] = "hello";

static void udp(void)
{
    struct sockaddr_in address;
    int receiver = bound_socket(SOCK_DGRAM, &address);
    int sender = socket(AF_INET, SOCK_DGRAM | SOCK_CLOEXEC, 0);
    if (sender < 0)
        fail("udp socket");
    for (int i = 0; i < PEERS; ++i)
        if (sendto(sender, payload, sizeof payload - 1, 0,
                   (struct sockaddr *)&address, sizeof address) < 0)
            fail("sendto");
    char data[SPLIT];
    struct iovec buffer = { .iov_base = data, .iov_len = sizeof data };
    for (int i = 0; i < PEERS; ++i) {
        struct msghdr message = { .msg_iov = &buffer, .msg_iovlen = 1 };
        ssize_t n = recvmsg(receiver, &message, 0);
        if (n < 0)
            fail("recvmsg");
        printf("datagram %d: %zd copied, truncated=%d, bytes=%.*s\n",
               i + 1, n, !!(message.msg_flags & MSG_TRUNC), (int)n, data);
    }
    close(sender);
    close(receiver);
}

int main(void)
{
    alarm(10);
    udp();
    return 0;
}
