#define _GNU_SOURCE
#include "tls-support.h"

static const char expected_host[] = "echo.lab.test";

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
    SSL_CTX *context = SSL_CTX_new(TLS_client_method());
    require(context && SSL_CTX_set_min_proto_version(context, TLS1_2_VERSION) &&
            SSL_CTX_load_verify_locations(context, "lab-ca.pem", NULL), "load the lab CA");
    SSL_CTX_set_verify(context, SSL_VERIFY_PEER, NULL);
    int fd = socket(AF_INET, SOCK_STREAM | SOCK_CLOEXEC, 0);
    require(fd >= 0 && connect(fd, (struct sockaddr *)&address, sizeof address) == 0, "connect");
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
    SSL_free(session);
    SSL_CTX_free(context);
    close(fd);
    int status;
    require(waitpid(server, &status, 0) == server && WIFEXITED(status) &&
            WEXITSTATUS(status) == (connected == 1 ? 0 : 2), "server exit");
    return 0;
}
