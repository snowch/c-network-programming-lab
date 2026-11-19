#define _GNU_SOURCE
#include "socket-support.h"

static int hand_over(int original, const int channel[2])
{
    union { struct cmsghdr align; char bytes[CMSG_SPACE(sizeof(int))]; } control = {0};
    char tag = 'D';
    struct iovec data = { .iov_base = &tag, .iov_len = 1 };
    struct msghdr message = {
        .msg_iov = &data, .msg_iovlen = 1,
        .msg_control = control.bytes, .msg_controllen = sizeof control.bytes
    };
    struct cmsghdr *entry = CMSG_FIRSTHDR(&message);
    entry->cmsg_level = SOL_SOCKET;
    entry->cmsg_type = SCM_RIGHTS;
    entry->cmsg_len = CMSG_LEN(sizeof original);
    memcpy(CMSG_DATA(entry), &original, sizeof original);
    require(sendmsg(channel[0], &message, 0) == 1, "pass the UDP socket");
    close(original);

    require(recvmsg(channel[1], &message, MSG_CMSG_CLOEXEC) == 1 &&
            !(message.msg_flags & MSG_CTRUNC), "receive the socket");
    entry = CMSG_FIRSTHDR(&message);
    require(entry && entry->cmsg_level == SOL_SOCKET && entry->cmsg_type == SCM_RIGHTS &&
            entry->cmsg_len == CMSG_LEN(sizeof(int)), "received descriptor");
    int received;
    memcpy(&received, CMSG_DATA(entry), sizeof received);
    return received;
}

int main(void)
{
    alarm(10);
    int channel[2];
    require(socketpair(AF_UNIX, SOCK_SEQPACKET, 0, channel) == 0, "Unix socket pair");
    struct sockaddr_in address;
    int original = attach_ipv4(SOCK_DGRAM, &address);
    int receiver = hand_over(original, channel);

    int sender = socket(AF_INET, SOCK_DGRAM, 0);
    const char request[] = "ready";
    require(sender >= 0 && sendto(sender, request, sizeof request - 1, 0,
            (struct sockaddr *)&address, sizeof address) == sizeof request - 1, "send datagram");
    ready(receiver, POLLIN);
    char data[8];
    struct iovec buffer = { .iov_base = data, .iov_len = sizeof data };
    struct msghdr message = { .msg_iov = &buffer, .msg_iovlen = 1 };
    ssize_t received = recvmsg(receiver, &message, 0);
    require(received >= 0, "receive through handed-off socket");
    require(received == (ssize_t)(sizeof data < sizeof request - 1 ? sizeof data : sizeof request - 1) &&
            !memcmp(data, request, (size_t)received), "verify datagram");
    printf("handed-off socket received %.*s, truncated=%d\n",
           (int)received, data, !!(message.msg_flags & MSG_TRUNC));
    close(sender);
    close(receiver);
    close(channel[0]);
    close(channel[1]);
    return 0;
}
