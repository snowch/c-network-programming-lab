export const walkthroughs = {
  "socket-apis-capstone": {
    "edit": "const char reply[]",
    "steps": [
      {
        "heading": "Discover the listening endpoint",
        "text": "The address initially contains port zero. Reading it back gives the real destination for the request.",
        "anchor": "require(bind(server,",
        "lines": 3
      },
      {
        "heading": "Reply to the observed sender",
        "text": "The server uses the address and length filled by recvfrom().",
        "anchor": "const char reply[]",
        "lines": 4
      }
    ]
  },
  "addressing-capstone": {
    "edit": "const char host[]",
    "steps": [
      {
        "heading": "Ask for an IPv6 datagram endpoint",
        "text": "The hints constrain the address family. Service zero leaves port selection to bind.",
        "anchor": "struct addrinfo hints",
        "lines": 5
      },
      {
        "heading": "Use the resolved address",
        "text": "Bind to the selected IPv6 address, then query the real port.",
        "anchor": "socklen_t length = sizeof destination;",
        "lines": 5
      }
    ]
  },
  "stream-capstone": {
    "edit": "const char request[]",
    "steps": [
      {
        "heading": "Decode the length and keep the first piece",
        "text": "The header describes the complete request, even when the sender has only sent two bytes so far.",
        "anchor": "uint32_t length = ntohl(header);",
        "lines": 4
      },
      {
        "heading": "Finish the request and wait for the reply",
        "text": "After the half-close, the server collects the remaining bytes and checks EOF.",
        "anchor": "send_all(client, request + 2,",
        "lines": 6
      }
    ]
  },
  "datagram-capstone": {
    "edit": "char data[8];",
    "steps": [
      {
        "heading": "Pass and close the descriptor",
        "text": "The queued Unix socket message keeps a reference while the receiver obtains a new descriptor.",
        "anchor": "require(sendmsg(channel[0]",
        "lines": 5
      },
      {
        "heading": "Read a datagram through the new descriptor",
        "text": "Wait for input and pass a bounded buffer to recvmsg().",
        "anchor": "ready(receiver, POLLIN);",
        "lines": 6
      }
    ]
  },
  "tls-diagnostics-capstone": {
    "edit": "static const char expected_host[]",
    "steps": [
      {
        "heading": "Keep packet reads on loopback",
        "text": "Bind the packet descriptor to the lo interface before connecting.",
        "anchor": "int capture = socket(AF_PACKET",
        "lines": 6
      },
      {
        "heading": "Correlate TCP and TLS evidence",
        "text": "The observed source and destination ports must match this connection. Certificate checking has its own result.",
        "anchor": "if (tcp.source == client",
        "lines": 4
      }
    ]
  },
  "first-recv": {
    "edit": "const char first_part[]",
    "steps": [
      {
        "heading": "Send the first piece",
        "text": "The client sends two bytes without the C string terminator.",
        "anchor": "const char first_part[]",
        "lines": 3
      },
      {
        "heading": "Measure one receive",
        "text": "Pass the full buffer capacity and use the return value for the number of bytes copied.",
        "anchor": "ssize_t received = recv(",
        "lines": 3
      }
    ]
  },
  "socket-api": {
    "edit": "requested_port =",
    "steps": [
      {
        "heading": "Ask Linux to bind it",
        "text": "The caller passes port 0 to endpoint(). That helper builds an address for 127.0.0.1, which reaches only this Linux guest. bind() assigns the local address to the socket. A zero port asks Linux to choose a free one.",
        "anchor": "*address = endpoint(port);",
        "lines": 2
      },
      {
        "heading": "Read back the result",
        "text": "getsockname() fills the address structure with the address and port the socket actually has. In the output code, ntohs() converts the port from network byte order so printf can display it.",
        "anchor": "socklen_t length = sizeof *address;",
        "lines": 2
      }
    ]
  },
  "datagram-api": {
    "edit": "const char message[]",
    "steps": [
      {
        "heading": "Send one message",
        "text": "The receiver already has an address from bind_loopback(). sendto() uses that address as the destination and sends the four bytes of ping. sizeof message - 1 excludes the C string terminator.",
        "anchor": "const char message[] = \"ping\";",
        "lines": 3
      },
      {
        "heading": "Receive bytes and a reply address",
        "text": "recvfrom() returns a byte count and writes the sender’s address into sender. The receiving program can pass that address back to sendto() to reply.",
        "anchor": "struct sockaddr_in sender;",
        "lines": 4
      }
    ]
  },
  "listen-api": {
    "edit": "const char payload =",
    "steps": [
      {
        "heading": "Listen on a bound address",
        "text": "Use the same local binding helper as before, but request SOCK_STREAM for TCP. listen() tells Linux to queue incoming connections on that descriptor.",
        "anchor": "int listening = bind_loopback(SOCK_STREAM, 0, &address);",
        "lines": 2
      },
      {
        "heading": "Accept a separate connection",
        "text": "The client connects to the listener’s address. accept() returns another descriptor for that conversation. The next send and recv use the connected sockets.",
        "anchor": "int connection = accept(listening, NULL, NULL);",
        "lines": 4
      }
    ]
  },
  "addresses": {
    "edit": ".ai_family =",
    "steps": [
      {
        "heading": "Describe the addresses you can use",
        "text": "hints limits the results to stream sockets. AF_UNSPEC lets the resolver return either IPv4 or IPv6.",
        "anchor": "struct addrinfo hints = {",
        "lines": 4
      },
      {
        "heading": "Resolve the name and service",
        "text": "getaddrinfo() returns a list of candidates in result. The example formats each address and frees the list after use.",
        "anchor": "int status = getaddrinfo(\"localhost\", \"8080\", &hints, &result);",
        "lines": 2
      }
    ]
  },
  "ipv6": {
    "edit": "char payload =",
    "steps": [
      {
        "heading": "Create IPv6 endpoints",
        "text": "AF_INET6 chooses IPv6 for both sockets. sockaddr_in6 stores the address, and IN6ADDR_LOOPBACK_INIT gives it the local IPv6 address ::1.",
        "anchor": "int server = socket(AF_INET6, SOCK_DGRAM | SOCK_CLOEXEC, 0);",
        "lines": 4
      },
      {
        "heading": "Reply to the observed source",
        "text": "recvfrom() fills peer with the sender’s IPv6 address and port. The same sendto() call you used with IPv4 can send the response to that address.",
        "anchor": "require(recvfrom(server, &response, 1, 0, (struct sockaddr *)&peer, &size) == 1,",
        "lines": 2
      }
    ]
  },
  "dns": {
    "edit": "static const char dns_name",
    "steps": [
      {
        "heading": "Build a question and remember its ID",
        "text": "res_mkquery() puts the question in wire. The first two bytes hold a transaction ID that the client can check when an answer arrives.",
        "anchor": "int query_size = res_mkquery(",
        "lines": 3
      },
      {
        "heading": "Check the answer before reading it",
        "text": "The client checks the transaction ID and the response bit first. It then reads the response code. Code 3 is NXDOMAIN, which means the name does not exist.",
        "anchor": "ssize_t got = recv(client, wire, sizeof wire, 0);",
        "lines": 5
      }
    ]
  },
  "stream": {
    "edit": "SPLIT =",
    "steps": [
      {
        "heading": "Make the first read before sending the rest",
        "text": "The program sends the first two bytes of hello and immediately calls recv(). The rest of the bytes have yet to be sent, even though the receive buffer has room for all five.",
        "anchor": "send_all(client, payload, SPLIT);",
        "lines": 2
      },
      {
        "heading": "Continue at the next empty byte",
        "text": "After sending the remainder, the receiver adds first to the destination pointer and subtracts it from the remaining length. This prevents the second read from overwriting the bytes already received.",
        "anchor": "send_all(client, payload + SPLIT, sizeof data - SPLIT);",
        "lines": 3
      }
    ]
  },
  "frames": {
    "edit": "send_frame(client, \"",
    "steps": [
      {
        "heading": "Write a length and then a payload",
        "text": "send_frame() writes a four-byte length in network byte order, then writes the payload. send_all() loops if the stream accepts fewer bytes than supplied.",
        "anchor": "uint32_t header = htonl(length);",
        "lines": 3
      },
      {
        "heading": "Validate the length before reading the body",
        "text": "The receiver converts the length back to a host number. It checks the buffer limit before it reads the body, and checks that the expected number of bytes arrived.",
        "anchor": "uint32_t length = ntohl(header);",
        "lines": 4
      }
    ]
  },
  "half-close": {
    "edit": "send_all(peer, \"",
    "steps": [
      {
        "heading": "Finish sending",
        "text": "The client sends the request and shuts down its write side. The peer can read the bytes and then sees EOF when it asks for more.",
        "anchor": "send_all(client, payload, sizeof payload - 1);",
        "lines": 3
      },
      {
        "heading": "Return an acknowledgement",
        "text": "The server can still send on its own write side. The client calls recv() on the same descriptor it previously half-closed.",
        "anchor": "send_all(peer, \"ok\", 2);",
        "lines": 3
      }
    ]
  },
  "udp": {
    "edit": "char data[",
    "steps": [
      {
        "heading": "Give the kernel a small buffer",
        "text": "SPLIT is two in the starter. The iovec describes where the bytes may be copied and how much space is available.",
        "anchor": "char data[SPLIT];",
        "lines": 2
      },
      {
        "heading": "Check the truncation flag",
        "text": "recvmsg() reports the number of copied bytes. MSG_TRUNC tells you the datagram also had bytes that did not fit. A later call cannot recover the discarded bytes.",
        "anchor": "printf(\"datagram %d: %zd copied, truncated=%d, bytes=%.*s",
        "lines": 2
      }
    ]
  },
  "deadline": {
    "edit": "const int answer_first_attempt =",
    "steps": [
      {
        "heading": "Wait for a reply for a bounded time",
        "text": "POLLIN asks poll() to wait for readable input. Zero means the deadline expired, so the loop advances to the next attempt.",
        "anchor": "struct pollfd incoming = { .fd = client, .events = POLLIN };",
        "lines": 6
      },
      {
        "heading": "Match the response to the request",
        "text": "The response echoes the request byte. Checking this ID distinguishes a reply to the current attempt from one to a different attempt.",
        "anchor": "unsigned char reply;",
        "lines": 3
      }
    ]
  },
  "unix": {
    "edit": "require(recvmsg(channel[1], &message,",
    "steps": [
      {
        "heading": "Attach the handle to the message",
        "text": "SCM_RIGHTS is a control message that transfers a reference to an open file. The receiver gets a new descriptor number for that same open object.",
        "anchor": "header->cmsg_type = SCM_RIGHTS;",
        "lines": 4
      },
      {
        "heading": "Set close-on-exec when receiving it",
        "text": "MSG_CMSG_CLOEXEC tells Linux to install the new descriptor with close-on-exec already set. Otherwise a future exec could inherit it.",
        "anchor": "require(recvmsg(channel[1], &message, MSG_CMSG_CLOEXEC)",
        "lines": 2
      }
    ]
  },
  "connect-status": {
    "edit": "const int accept_connections =",
    "steps": [
      {
        "heading": "Wait if connect is still in progress",
        "text": "EINPROGRESS means the connection attempt is still under way. The program asks poll() for a writable event and then checks the connection outcome separately.",
        "anchor": "int result = connect(client, (struct sockaddr *)&address, sizeof address);",
        "lines": 5
      },
      {
        "heading": "Read the result from the socket",
        "text": "SO_ERROR reports the pending socket error. Zero means success, while ECONNREFUSED means nothing accepted the connection.",
        "anchor": "int error = 0;",
        "lines": 4
      }
    ]
  },
  "readiness": {
    "edit": "char data[",
    "steps": [
      {
        "heading": "Try a read without blocking",
        "text": "MSG_DONTWAIT makes this call return immediately. Because the client has sent nothing yet, Linux reports EAGAIN.",
        "anchor": "ssize_t n = recv(peer, data, sizeof data, MSG_DONTWAIT);",
        "lines": 3
      },
      {
        "heading": "Ask the kernel to wait for readable input",
        "text": "POLLIN asks for a readable event. The first wait times out. After the client sends bytes, a second wait reports that data is ready.",
        "anchor": "struct pollfd item = { .fd = peer, .events = POLLIN };",
        "lines": 5
      }
    ]
  },
  "backpressure": {
    "edit": "int capacity =",
    "steps": [
      {
        "heading": "Stop sending when the socket cannot accept more",
        "text": "A nonblocking send returns EAGAIN when it cannot accept more data. The test deliberately leaves the peer idle while the buffer fills.",
        "anchor": "ssize_t n = send(client, data, sizeof data, MSG_DONTWAIT | MSG_NOSIGNAL);",
        "lines": 5
      },
      {
        "heading": "Wait for room before retrying",
        "text": "After the peer drains the queued data, poll() reports POLLOUT. Only then does the program retry the extra byte.",
        "anchor": "struct pollfd watch = { .fd = client, .events = POLLOUT };",
        "lines": 4
      }
    ]
  },
  "epoll": {
    "edit": "PEERS =",
    "steps": [
      {
        "heading": "Register each peer with its own identifier",
        "text": "Each registration asks for input events and associates the registration with the index i. The event loop can use that index to find the right socket.",
        "anchor": "struct epoll_event watch = { .events = EPOLLIN, .data.u32 = (uint32_t)i };",
        "lines": 3
      },
      {
        "heading": "Use the identifier returned by epoll",
        "text": "epoll_wait() returns ready events. Reading the index from the event selects one socket and its own state.",
        "anchor": "int count = epoll_wait(queue, events, PEERS, 1000);",
        "lines": 6
      }
    ]
  },
  "tls": {
    "edit": "static const char expected_host[]",
    "steps": [
      {
        "heading": "Enable peer verification",
        "text": "The earlier setup loads the lab certificate authority. SSL_VERIFY_PEER requires the server to present a certificate that can be verified against that trust store.",
        "anchor": "SSL_CTX_set_verify(context, SSL_VERIFY_PEER, NULL);",
        "lines": 1
      },
      {
        "heading": "Tell OpenSSL which host to verify",
        "text": "SSL_set1_host() sets the name the certificate must match. SSL_connect() performs the handshake before the program tries to send the application message.",
        "anchor": "require(session && SSL_set1_host(session, expected_host) &&",
        "lines": 3
      }
    ]
  },
  "packets": {
    "edit": "static const char payload[]",
    "steps": [
      {
        "heading": "Observe IPv4 on loopback",
        "text": "AF_PACKET lets the program observe packets at an interface. This exercise selects IPv4 and binds the capture socket to the guest’s loopback interface.",
        "anchor": "int capture = socket(AF_PACKET, SOCK_DGRAM | SOCK_CLOEXEC, htons(ETH_P_IP));",
        "lines": 4
      },
      {
        "heading": "Read the three length fields",
        "text": "The IPv4 total includes the IPv4 header. The UDP length includes its own header and payload. Subtract the UDP header size from that length to get the payload size.",
        "anchor": "printf(\"loopback IPv4 total=%u bytes, UDP total=%u bytes, payload=%zu bytes",
        "lines": 3
      }
    ]
  },
  "capstone": {
    "edit": "PEERS =",
    "steps": [
      {
        "heading": "Send two frames and finish the write side",
        "text": "First send a text frame, then a zero-length frame. The half-close tells the server when no more frame headers are coming.",
        "anchor": "send_frame(client, payload, sizeof payload - 1);",
        "lines": 3
      },
      {
        "heading": "Distinguish the empty frame from EOF",
        "text": "The empty frame has a real length field set to zero. EOF arrives after that frame, when the next read returns zero bytes.",
        "anchor": "ntohl(header) == 0, \"empty frame\");",
        "lines": 2
      }
    ]
  },
  "create-socket": {
    "edit": "int type =",
    "steps": [
      {
        "heading": "Ask Linux for a socket",
        "text": "AF_INET chooses IPv4 and SOCK_DGRAM selects UDP for this address family. Linux returns a number you can use to refer to the socket.",
        "anchor": "int type = SOCK_DGRAM;",
        "lines": 2
      },
      {
        "heading": "Check the result before using it",
        "text": "A descriptor can be zero or greater. The value -1 means the call failed. perror() uses errno, the error number set by the failed call, to print the reason.",
        "anchor": "if (fd == -1)",
        "lines": 4
      }
    ]
  },
  "bind-socket": {
    "edit": "unsigned short port =",
    "steps": [
      {
        "heading": "Describe the local endpoint",
        "text": "INADDR_LOOPBACK supplies the address 127.0.0.1 inside the guest. htons() arranges the bytes of the port number in the order the socket address expects.",
        "anchor": "unsigned short port = 4040;",
        "lines": 6
      },
      {
        "heading": "Assign that endpoint to the socket",
        "text": "Pass the descriptor, the address and its size to bind(). A successful call returns zero. The error branch closes the socket before the program exits.",
        "anchor": "if (bind(fd,",
        "lines": 5
      }
    ]
  }
};
