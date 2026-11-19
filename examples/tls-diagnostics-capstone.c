#define _GNU_SOURCE
#include "tls-support.h"
#include <linux/if_ether.h>
#include <linux/if_packet.h>
#include <net/if.h>
#include <netinet/ip.h>
#include <netinet/tcp.h>
#include <poll.h>

static const char expected_host[] = "echo.lab.test";

static int capture_loopback(void)
{
    int capture = socket(AF_PACKET, SOCK_DGRAM | SOCK_CLOEXEC, htons(ETH_P_IP));
    unsigned int index = if_nametoindex("lo");
    struct sockaddr_ll link = {
        .sll_family = AF_PACKET, .sll_protocol = htons(ETH_P_IP), .sll_ifindex = (int)index
    };
    require(capture >= 0 && index && bind(capture, (struct sockaddr *)&link, sizeof link) == 0,
            "capture IPv4 on loopback");
    return capture;
}

static int observe_connection(int capture, uint16_t client, uint16_t server)
{
    struct pollfd watch = { .fd = capture, .events = POLLIN };
    for (int attempt = 0; attempt < 128 && poll(&watch, 1, 100) == 1; ++attempt) {
        unsigned char bytes[2048];
        ssize_t size = recv(capture, bytes, sizeof bytes, MSG_DONTWAIT);
        if (size < (ssize_t)sizeof(struct iphdr))
            continue;
        struct iphdr ip;
        memcpy(&ip, bytes, sizeof ip);
        size_t offset = ip.ihl * 4u;
        struct tcphdr tcp;
        if (ip.version != 4 || ip.protocol != IPPROTO_TCP || offset < sizeof ip ||
            offset + sizeof tcp > (size_t)size)
            continue;
        memcpy(&tcp, bytes + offset, sizeof tcp);
        if (tcp.source == client && tcp.dest == server) {
            printf("loopback TCP observed: %u -> %u\n", (unsigned)ntohs(client), (unsigned)ntohs(server));
            return 1;
        }
    }
    return 0;
}

int main(void)
{
    alarm(25);
    signal(SIGPIPE, SIG_IGN);
    struct sockaddr_in address;
    int listener = listen_loopback(&address);
    pid_t server = fork();
    require(server >= 0, "fork");
    if (server == 0)
        serve(listener);
    close(listener);
    int capture = capture_loopback();
    SSL_CTX *context = SSL_CTX_new(TLS_client_method());
    require(context && SSL_CTX_set_min_proto_version(context, TLS1_2_VERSION) &&
            SSL_CTX_load_verify_locations(context, "lab-ca.pem", NULL), "load the lab CA");
    SSL_CTX_set_verify(context, SSL_VERIFY_PEER, NULL);
    int fd = socket(AF_INET, SOCK_STREAM | SOCK_CLOEXEC, 0);
    require(fd >= 0 && connect(fd, (struct sockaddr *)&address, sizeof address) == 0, "connect");
    struct sockaddr_in local;
    socklen_t length = sizeof local;
    require(getsockname(fd, (struct sockaddr *)&local, &length) == 0, "client endpoint");
    SSL *session = SSL_new(context);
    require(session && SSL_set1_host(session, expected_host) &&
            SSL_set_tlsext_host_name(session, expected_host) && SSL_set_fd(session, fd), "configure TLS client");
    int connected = SSL_connect(session);
    long check = SSL_get_verify_result(session);
    if (connected != 1) {
        require(check == X509_V_ERR_HOSTNAME_MISMATCH, "TLS handshake");
        printf("TLS rejected %s: %s\n", expected_host, X509_verify_cert_error_string(check));
    } else {
        require(check == X509_V_OK, "verify peer");
        size_t sent;
        char echo[sizeof message - 1];
        require(SSL_write_ex(session, message, sizeof message - 1, &sent) &&
                sent == sizeof message - 1 && read_message(session, echo, sizeof echo) &&
                !memcmp(echo, message, sizeof echo), "verify encrypted echo");
        printf("%s verified %s using %s\n", SSL_get_version(session), expected_host,
               SSL_get_cipher_name(session));
        printf("encrypted echo: %.*s\n", (int)sizeof echo, echo);
        SSL_shutdown(session);
    }
    require(observe_connection(capture, local.sin_port, address.sin_port), "find this client and server in capture");
    close(capture);
    SSL_free(session);
    SSL_CTX_free(context);
    close(fd);
    int status;
    require(waitpid(server, &status, 0) == server && WIFEXITED(status) &&
            WEXITSTATUS(status) == (connected == 1 ? 0 : 2), "server exit");
    return 0;
}
