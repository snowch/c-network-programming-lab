#define _GNU_SOURCE
#include "socket-support.h"

enum { DNS_TTL = 30, DNS_BUFFER = 512 };

static const char dns_name[] = "echo.lab.test";

static void dns_reply(unsigned char buffer[DNS_BUFFER], size_t length, size_t *reply_size)
{
    char requested[256];
    int consumed = dn_expand(buffer, buffer + length, buffer + 12, requested, sizeof requested);
    require(consumed >= 0 && 12 + (size_t)consumed + 4 == length, "DNS question bounds");
    unsigned int found = !strcmp(requested, "echo.lab.test");
    buffer[2] = 0x81;                    /* Response, recursion desired copied. */
    buffer[3] = found ? 0x00 : 0x03;     /* Success or NXDOMAIN. */
    buffer[7] = (unsigned char)found;
    if (found) {
        const unsigned char record[] = {
            0xc0, 0x0c,                 /* Name pointer to the question. */
            0, 1, 0, 1,                 /* Type A, class IN. */
            0, 0, 0, DNS_TTL,           /* Time to live in network byte order. */
            0, 4, 127, 0, 0, 1
        };
        require(length + sizeof record <= DNS_BUFFER, "DNS answer bounds");
        memcpy(buffer + length, record, sizeof record);
        length += sizeof record;
    }
    *reply_size = length;
}

static void dns_exchange(void)
{
    struct sockaddr_in resolver;
    int server = attach_ipv4(SOCK_DGRAM, &resolver);
    int client = socket(AF_INET, SOCK_DGRAM | SOCK_CLOEXEC, 0);
    require(client >= 0 && connect(client, (struct sockaddr *)&resolver, sizeof resolver) == 0,
            "connect DNS socket");
    unsigned char wire[DNS_BUFFER];
    int query_size = res_mkquery(0, dns_name, 1, 1, NULL, 0, NULL, wire, sizeof wire);
    require(query_size >= 17, "make DNS query");
    const uint16_t transaction = (uint16_t)((wire[0] << 8) | wire[1]);
    require(send(client, wire, (size_t)query_size, 0) == query_size, "send query");
    ready(server, POLLIN);
    struct sockaddr_in from;
    socklen_t size = sizeof from;
    require(recvfrom(server, wire, sizeof wire, 0, (struct sockaddr *)&from, &size) == query_size,
            "receive query");
    size_t reply_size;
    dns_reply(wire, (size_t)query_size, &reply_size);
    require(sendto(server, wire, reply_size, 0, (struct sockaddr *)&from, size) == (ssize_t)reply_size,
            "send DNS answer");
    ready(client, POLLIN);
    ssize_t got = recv(client, wire, sizeof wire, 0);
    require(got >= query_size && ((wire[0] << 8) | wire[1]) == transaction && (wire[2] & 0x80),
            "match DNS transaction");
    unsigned int code = wire[3] & 15;
    if (code == 3) {
        printf("%s: NXDOMAIN\n", dns_name);
    } else {
        require(code == 0 && wire[7] == 1 && got == query_size + 16, "expected one A record");
        const unsigned char *answer = wire + query_size;
        char numeric[INET_ADDRSTRLEN];
        require(inet_ntop(AF_INET, answer + 12, numeric, sizeof numeric) != NULL, "format address");
        uint32_t ttl;
        memcpy(&ttl, answer + 6, sizeof ttl);
        printf("%s: A %s, TTL %u seconds\n", dns_name, numeric, (unsigned)ntohl(ttl));
    }
    close(client);
    close(server);
}

int main(void)
{
    alarm(15);
    dns_exchange();
    return 0;
}
