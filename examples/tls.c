#define _GNU_SOURCE
#include <arpa/inet.h>
#include <openssl/err.h>
#include <openssl/ssl.h>
#include <openssl/x509v3.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/wait.h>
#include <unistd.h>

static const char expected_host[] = "echo.lab.test";
static const char message[] = "encrypted echo";

static void require(int condition, const char *operation)
{
    if (!condition) {
        fprintf(stderr, "%s failed\n", operation);
        ERR_print_errors_fp(stderr);
        exit(EXIT_FAILURE);
    }
}

static int listen_loopback(struct sockaddr_in *address)
{
    int fd = socket(AF_INET, SOCK_STREAM | SOCK_CLOEXEC, 0);
    *address = (struct sockaddr_in){
        .sin_family = AF_INET, .sin_addr.s_addr = htonl(INADDR_LOOPBACK)
    };
    socklen_t size = sizeof *address;
    require(fd >= 0 && bind(fd, (struct sockaddr *)address, size) == 0 &&
            listen(fd, 1) == 0 && getsockname(fd, (struct sockaddr *)address, &size) == 0,
            "listen on loopback");
    return fd;
}

static int read_message(SSL *session, char *buffer, size_t length)
{
    size_t received = 0;
    while (received < length) {
        size_t part;
        if (!SSL_read_ex(session, buffer + received, length - received, &part))
            return 0;
        received += part;
    }
    return 1;
}

static void serve(int listener)
{
    alarm(25);
    SSL_CTX *context = SSL_CTX_new(TLS_server_method());
    require(context && SSL_CTX_set_min_proto_version(context, TLS1_2_VERSION) &&
            SSL_CTX_use_certificate_file(context, "lab-server.pem", SSL_FILETYPE_PEM) &&
            SSL_CTX_use_PrivateKey_file(context, "lab-server-key.pem", SSL_FILETYPE_PEM) &&
            SSL_CTX_check_private_key(context), "load the lab certificate and key");
    int peer = accept4(listener, NULL, NULL, SOCK_CLOEXEC);
    require(peer >= 0, "accept");
    close(listener);
    SSL *session = SSL_new(context);
    require(session && SSL_set_fd(session, peer), "attach the server socket");
    int established = SSL_accept(session);
    if (established == 1) {
        char data[sizeof message - 1];
        size_t sent;
        require(read_message(session, data, sizeof data) &&
                SSL_write_ex(session, data, sizeof data, &sent) && sent == sizeof data,
                "echo through TLS");
        SSL_shutdown(session);
    }
    SSL_free(session);
    SSL_CTX_free(context);
    close(peer);
    _exit(established == 1 ? 0 : 2);
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
