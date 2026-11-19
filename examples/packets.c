#define _GNU_SOURCE
#include "socket-support.h"

static void observe_packets(void)
{
    struct sockaddr_in endpoint;
    int receiver = attach_ipv4(SOCK_DGRAM, &endpoint);
    int capture = socket(AF_PACKET, SOCK_DGRAM | SOCK_CLOEXEC, htons(ETH_P_IP));
    require(capture >= 0, "packet socket");
    unsigned int loopback = if_nametoindex("lo");
    require(loopback != 0, "loopback interface");
    struct sockaddr_ll link = {
        .sll_family = AF_PACKET, .sll_protocol = htons(ETH_P_IP), .sll_ifindex = (int)loopback
    };
    require(bind(capture, (struct sockaddr *)&link, sizeof link) == 0, "bind packet socket");
    int sender = socket(AF_INET, SOCK_DGRAM | SOCK_CLOEXEC, 0);
    static const char payload[] = "capture";
    require(sender >= 0 && sendto(sender, payload, sizeof payload - 1, 0,
            (struct sockaddr *)&endpoint, sizeof endpoint) == sizeof payload - 1, "send datagram");
    for (;;) {
        unsigned char bytes[128];
        ready(capture, POLLIN);
        ssize_t n = recv(capture, bytes, sizeof bytes, 0);
        require(n >= 0, "recv packet");
        if (n < (ssize_t)sizeof(struct iphdr))
            continue;
        struct iphdr ip;
        memcpy(&ip, bytes, sizeof ip);
        size_t offset = ip.ihl * 4u;
        struct udphdr udp;
        if (ip.version != 4 || ip.protocol != IPPROTO_UDP ||
            offset < sizeof ip || offset + sizeof udp > (size_t)n)
            continue;
        memcpy(&udp, bytes + offset, sizeof udp);
        if (udp.dest != endpoint.sin_port)
            continue;
        printf("loopback IPv4 total=%u bytes, UDP total=%u bytes, payload=%zu bytes\n",
               (unsigned)ntohs(ip.tot_len), (unsigned)ntohs(udp.len),
               (size_t)ntohs(udp.len) - sizeof udp);
        break;
    }
    close(sender);
    close(capture);
    close(receiver);
}

int main(void)
{
    alarm(15);
    observe_packets();
    return 0;
}
