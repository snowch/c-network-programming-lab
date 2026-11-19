#define _GNU_SOURCE
#include "socket-support.h"

static void descriptor_message(void)
{
    int channel[2], data[2];
    require(socketpair(AF_UNIX, SOCK_SEQPACKET | SOCK_CLOEXEC, 0, channel) == 0, "socketpair");
    require(pipe2(data, O_CLOEXEC) == 0, "pipe2");
    char payload = 'F';
    require(write(data[1], &payload, 1) == 1, "write to pipe");
    close(data[1]);
    union { struct cmsghdr align; char bytes[CMSG_SPACE(sizeof(int))]; } control = {0};
    struct iovec vector = { &payload, 1 };
    struct msghdr message = {
        .msg_iov = &vector, .msg_iovlen = 1,
        .msg_control = control.bytes, .msg_controllen = sizeof control.bytes
    };
    struct cmsghdr *header = CMSG_FIRSTHDR(&message);
    header->cmsg_level = SOL_SOCKET;
    header->cmsg_type = SCM_RIGHTS;
    header->cmsg_len = CMSG_LEN(sizeof(int));
    memcpy(CMSG_DATA(header), &data[0], sizeof data[0]);
    require(sendmsg(channel[0], &message, 0) == 1, "sendmsg");
    close(data[0]);

    memset(control.bytes, 0, sizeof control.bytes);
    payload = 0;
    require(recvmsg(channel[1], &message, MSG_CMSG_CLOEXEC) == 1 &&
            !(message.msg_flags & MSG_CTRUNC), "recvmsg");
    header = CMSG_FIRSTHDR(&message);
    require(header && header->cmsg_level == SOL_SOCKET && header->cmsg_type == SCM_RIGHTS &&
            header->cmsg_len == CMSG_LEN(sizeof(int)), "missing descriptor");
    int received;
    memcpy(&received, CMSG_DATA(header), sizeof received);
    char value;
    require(read(received, &value, 1) == 1 && value == 'F', "read received pipe");
    int flags = fcntl(received, F_GETFD);
    require(flags >= 0, "fcntl");
    printf("message %c, passed pipe read %c, close-on-exec=%d\n",
           payload, value, !!(flags & FD_CLOEXEC));
    close(received);
    close(channel[0]);
    close(channel[1]);
}

int main(void)
{
    alarm(15);
    descriptor_message();
    return 0;
}
