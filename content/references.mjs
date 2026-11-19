function man(page, note, title) {
  const [name, section] = page.split('.');
  return {
    title: title ?? `${name}(${section})`,
    url: `https://man7.org/linux/man-pages/man${section}/${page}.html`,
    note
  };
}
function ssl(name, note) {
  return { title: name + '()', url: 'https://docs.openssl.org/3.5/man3/' + name + '/', note };
}

const socket = man('socket.2', 'socket() in <sys/socket.h> returns a nonnegative file descriptor or -1 and sets errno. AF_INET selects IPv4 and SOCK_DGRAM creates a datagram endpoint.');
const close = man('close.2', 'close() in <unistd.h> releases the descriptor. It returns 0 on success. The descriptor number can be reused after the call.');
const bind = man('bind.2', 'bind() assigns a local address to a socket. Pass the address structure and its byte size. With an Internet address and port 0, Linux selects a port.');
const localAddress = man('getsockname.2', 'getsockname() reports the actual local address and port. Initialise the length to the buffer size. On return, it reports the address length.');
const byteOrder = man('byteorder.3', 'htons() and htonl() convert 16-bit and 32-bit values to network byte order. ntohs() and ntohl() convert them back. A socket address stores the port in network byte order.', 'htons(), htonl(), ntohs(), ntohl()');
const connect = man('connect.2', 'connect() connects a stream socket to a peer. On a nonblocking descriptor, EINPROGRESS means to wait for readiness and check SO_ERROR.');
const listen = man('listen.2', 'listen() turns a bound stream socket into a listening socket. Its backlog argument limits how many completed connections can wait for accept() on Linux.');
const accept = man('accept.2', 'accept() returns a new connected descriptor. The listening descriptor remains available for other connections. accept4() can set SOCK_NONBLOCK and SOCK_CLOEXEC at creation.', 'accept(), accept4()');
const send = man('send.2', 'Check the byte count from send(). A stream send may accept only part of the buffer. sendto() also takes an explicit destination address.', 'send(), sendto(), sendmsg()');
const recv = man('recv.2', 'recv() returns the number of bytes read. On a stream, 0 signals EOF when a nonempty buffer was supplied. For UDP, recvfrom() can return the sender address.', 'recv(), recvfrom(), recvmsg()');
const poll = man('poll.2', 'poll() returns a count of descriptors with events, 0 on timeout or -1 on error. Read revents to tell which events occurred.');
const shutdown = man('shutdown.2', 'shutdown(fd, SHUT_WR) closes the sending direction. The descriptor can still receive the peer’s reply.');
const sockopt = man('getsockopt.2', 'At SOL_SOCKET, getsockopt(SO_ERROR) retrieves and clears the pending socket error. setsockopt(SO_SNDBUF) requests a send buffer size. Linux doubles the requested value for bookkeeping.', 'getsockopt(), setsockopt()');
const epoll = man('epoll.7', 'Register descriptors with epoll_ctl(), then collect ready events with epoll_wait(). Use the event data to find the state for each peer.', 'epoll_create1(), epoll_ctl(), epoll_wait()');

export const references = {
  'create-socket': [socket, close],
  'bind-socket': [bind, byteOrder, socket],
  'socket-api': [bind, localAddress, byteOrder, man('inet_ntop.3', 'inet_ntop() converts the binary IP address to text. Use an INET_ADDRSTRLEN buffer for IPv4.')],
  'datagram-api': [send, recv, localAddress],
  'listen-api': [listen, connect, accept, recv],
  addresses: [
    man('getaddrinfo.3', 'Use AF_UNSPEC to ask for any address family, or AF_INET6 to request IPv6. Check the function’s return code with gai_strerror() and release the list with freeaddrinfo().', 'getaddrinfo(), freeaddrinfo(), gai_strerror()'),
    man('getnameinfo.3', 'Use NI_NUMERICHOST and NI_NUMERICSERV to print the address and port without a name lookup.')
  ],
  ipv6: [
    man('ipv6.7', 'Use AF_INET6 and struct sockaddr_in6. in6addr_loopback is the binary address for ::1.', 'IPv6 sockets'),
    man('inet_ntop.3', 'Pass AF_INET6 and the sin6_addr field to turn a binary IPv6 address into text. Allow INET6_ADDRSTRLEN bytes.'), send, recv
  ],
  dns: [
    { title: 'RFC 1035 · DNS message format', url: 'https://www.rfc-editor.org/rfc/rfc1035#section-4.1', note: 'Read the header and question layout, A record data, TTL and RCODE. Response code 3 is the name error commonly called NXDOMAIN.' },
    byteOrder, send, recv
  ],
  stream: [man('tcp.7', 'TCP delivers an ordered byte stream. A receive call can return only the bytes currently available, independent of how the peer grouped its sends.', 'TCP sockets'), send, recv],
  frames: [byteOrder, send, recv],
  'half-close': [shutdown, recv, close],
  udp: [
    man('udp.7', 'One receive operation consumes one datagram. When the buffer is too small, the rest is discarded and recvmsg() reports MSG_TRUNC.', 'UDP sockets'), recv, send
  ],
  deadline: [poll, send, recv],
  unix: [
    man('unix.7', 'An SCM_RIGHTS message passes a reference to the underlying open file over an AF_UNIX socket. The receiver gets a descriptor number in its own table.', 'Unix-domain sockets and SCM_RIGHTS'),
    man('cmsg.3', 'Use CMSG_SPACE() to size the ancillary buffer and CMSG_LEN() for cmsg_len. CMSG_DATA() locates the payload.', 'CMSG_SPACE(), CMSG_LEN(), CMSG_DATA()'),
    man('recv.2', 'Pass MSG_CMSG_CLOEXEC to recvmsg() to set close-on-exec on received descriptors.', 'recvmsg()'),
    man('fcntl.2', 'Use F_GETFD to test the FD_CLOEXEC flag on the received descriptor.', 'fcntl(F_GETFD)')
  ],
  'connect-status': [connect, poll, sockopt],
  readiness: [poll, man('recv.2', 'MSG_DONTWAIT requests a nonblocking receive for this call. With no data ready, it fails with EAGAIN or EWOULDBLOCK. After POLLIN, attempt the receive to find out whether data or EOF is available.', 'recv()'), send],
  backpressure: [sockopt, send, poll, recv],
  epoll: [epoll, accept, send, recv],
  tls: [
    ssl('SSL_CTX_load_verify_locations', 'Load the lab CA into the trust store. The client also enables SSL_VERIFY_PEER so certificate verification is enforced.'),
    ssl('SSL_set1_host', 'Set the expected DNS name for certificate verification. SSL_set_tlsext_host_name() supplies the server name in the handshake.'),
    ssl('SSL_connect', 'Start a client-side handshake on the socket attached with SSL_set_fd(). A return value of 1 means it succeeded.'),
    ssl('SSL_get_verify_result', 'Read the certificate verification result. The wrong name produces X509_V_ERR_HOSTNAME_MISMATCH in this lab.'),
    ssl('SSL_read_ex', 'SSL_read_ex() and SSL_write_ex() report success separately from the byte count. Accumulate reads until all the application bytes arrive.')
  ],
  packets: [
    man('packet.7', 'AF_PACKET with SOCK_DGRAM supplies cooked packets without the link-layer header. Bind a sockaddr_ll to restrict capture to the loopback interface.', 'AF_PACKET sockets'),
    man('if_nametoindex.3', 'Convert lo to its interface index for sockaddr_ll.sll_ifindex. A return value of 0 reports an error.'),
    byteOrder,
    { title: 'RFC 791 · IPv4 header', url: 'https://www.rfc-editor.org/rfc/rfc791#section-3.1', note: 'IHL gives the header length in 32-bit words. Multiply by four to locate the start of UDP.' },
    { title: 'RFC 768 · UDP header', url: 'https://www.rfc-editor.org/rfc/rfc768', note: 'The UDP length covers the eight-byte header and its payload.' }
  ],
  capstone: [accept, byteOrder, send, recv, shutdown]
};
