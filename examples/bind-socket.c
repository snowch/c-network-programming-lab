#include <arpa/inet.h>
#include <stdio.h>
#include <sys/socket.h>
#include <unistd.h>

int main(void)
{
    int fd = socket(AF_INET, SOCK_DGRAM, 0);
    if (fd == -1) {
        perror("socket");
        return 1;
    }
    unsigned short port = 4040;
    struct sockaddr_in local = {
        .sin_family = AF_INET,
        .sin_addr.s_addr = htonl(INADDR_LOOPBACK),
        .sin_port = htons(port)
    };
    if (bind(fd, (struct sockaddr *)&local, sizeof local) == -1) {
        perror("bind");
        close(fd);
        return 1;
    }
    printf("bound to 127.0.0.1:%u\n", (unsigned)port);
    return close(fd) == 0 ? 0 : 1;
}
