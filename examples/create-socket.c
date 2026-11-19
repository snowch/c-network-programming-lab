#include <stdio.h>
#include <sys/socket.h>
#include <unistd.h>

int main(void)
{
    int type = SOCK_DGRAM;
    int fd = socket(AF_INET, type, 0);
    if (fd == -1) {
        perror("socket");
        return 1;
    }
    printf("socket returned descriptor %d\n", fd);
    return close(fd) == 0 ? 0 : 1;
}
