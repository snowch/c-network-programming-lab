#define _GNU_SOURCE
#include "tcp-support.h"

enum { LIMIT = 64, PEERS = 2 };

static const char payload[] = "hello";

static void send_frame(int fd, const char *data, uint32_t length)
{
    uint32_t header = htonl(length);
    send_all(fd, &header, sizeof header);
    send_all(fd, data, length);
}

static void echo_frames(int peer)
{
    for (;;) {
        uint32_t header;
        size_t n = receive(peer, &header, sizeof header);
        if (!n)
            return;
        check(n == sizeof header, "truncated header");
        uint32_t length = ntohl(header);
        check(length <= LIMIT, "oversized frame");
        char frame[LIMIT];
        check(receive(peer, frame, length) == length, "truncated frame");
        send_frame(peer, frame, length);
    }
}

static void framed_session(void)
{
    struct sockaddr_in address;
    int server = listen_on(&address);
    fflush(stdout);
    pid_t child = fork();
    if (child < 0)
        fail("fork");
    if (child == 0) {
        alarm(10);
        for (int i = 0; i < PEERS; ++i) {
            int peer = accept_one(server);
            echo_frames(peer);
            close(peer);
        }
        close(server);
        _exit(0);
    }
    close(server);
    for (int i = 0; i < PEERS; ++i) {
        int client = connect_to(&address);
        send_frame(client, payload, sizeof payload - 1);
        send_frame(client, "", 0);
        check(shutdown(client, SHUT_WR) == 0, "half close");
        uint32_t header;
        char echoed[sizeof payload - 1];
        check(receive(client, &header, sizeof header) == sizeof header &&
              ntohl(header) == sizeof echoed, "echo header");
        check(receive(client, echoed, sizeof echoed) == sizeof echoed &&
              !memcmp(echoed, payload, sizeof echoed), "echo payload");
        check(receive(client, &header, sizeof header) == sizeof header &&
              ntohl(header) == 0, "empty frame");
        check(receive(client, echoed, 1) == 0, "echo session did not close");
        printf("client %d verified text, empty frame and EOF\n", i + 1);
        close(client);
    }
    int status;
    check(waitpid(child, &status, 0) == child && WIFEXITED(status) &&
          WEXITSTATUS(status) == 0, "server exit status");
    puts("server process reaped");
}

int main(void)
{
    alarm(10);
    framed_session();
    return 0;
}
