#define _GNU_SOURCE
#include "tcp-support.h"

int main(void)
{
    alarm(10);
    struct sockaddr_in address;
    int listener = listen_on(&address);
    int client = connect_to(&address);
    int receiver = accept_one(listener);

    const char first_part[] = "he";
    char buffer[5];
    send_all(client, first_part, sizeof first_part - 1);
    ssize_t received = recv(receiver, buffer, sizeof buffer, 0);
    check(received > 0, "expected bytes from the client");
    printf("first recv: %zd bytes in a %zu-byte buffer\n", received, sizeof buffer);

    close(receiver);
    close(client);
    close(listener);
    return 0;
}
