export const course = {
  "slug": "c-network-programming-lab",
  "title": "C Network Programming Lab",
  "overview": {
    "description": "Build network programs using the Linux socket API. Start by creating a socket, binding it, and reading its port in three short runs. Then work through UDP, TCP, framing, backpressure, DNS, TLS and packet inspection.",
    "prerequisites": "Know basic C. The exercises use loopback and bundled DNS and TLS fixtures inside the guest."
  },
  "summary": "Learn Linux socket APIs in C, then build and diagnose TCP, UDP, DNS and TLS exchanges.",
  "instructions": "Run in Linux sends the editor contents to the guest. GCC compiles new or edited source before running the exercise. Use the console output to check your prediction.",
  "files": {
    "network.c": "./examples/network.c",
    "socket-basics.c": "./examples/socket-basics.c",
    "socket-tools.c": "./examples/socket-tools.c",
    "tls.c": "./examples/tls.c",
    "create-socket.c": "./examples/create-socket.c",
    "bind-socket.c": "./examples/bind-socket.c"
  },
  "prepare": "if [ ! -x /tmp/net ] || ! cmp -s /tmp/lesson-input/network.c /tmp/net.source; then\n    echo 'Compiling network.c in Linux'\n    gcc -std=c11 -Wall -Wextra -Werror /tmp/lesson-input/network.c -o /tmp/net.next\n    mv /tmp/net.next /tmp/net\n    cp /tmp/lesson-input/network.c /tmp/net.source\nfi",
  "lessons": [
    {
      "id": "create-socket",
      "section": "Socket APIs",
      "title": "Create a UDP socket",
      "file": "create-socket.c",
      "focus": "int fd = socket(",
      "intro": "Create a UDP socket and see what Linux gives back.",
      "question": "What does a successful call to socket() give you?",
      "task": "Change type from SOCK_DGRAM to -1, then select Run in Linux again. Find the error message. Restore the starter before moving on.",
      "hint": "Linux rejects socket types it does not recognise. Look for the return value checked by the if statement.",
      "explanation": "The starter call returns a nonnegative descriptor, such as 3. When the type is invalid, socket() returns -1. perror() explains the error and the program exits with status 1.",
      "transfer": "Why would you avoid passing the result to another socket call until you have checked it?",
      "reference": [
        "Read socket(2)",
        "https://man7.org/linux/man-pages/man2/socket.2.html"
      ],
      "prepare": "if [ ! -x /tmp/create-socket ] || ! cmp -s /tmp/lesson-input/create-socket.c /tmp/create-socket.source; then\n    echo 'Compiling create-socket.c in Linux'\n    gcc -std=c11 -Wall -Wextra -Werror /tmp/lesson-input/create-socket.c -o /tmp/create-socket.next\n    mv /tmp/create-socket.next /tmp/create-socket\n    cp /tmp/lesson-input/create-socket.c /tmp/create-socket.source\nfi",
      "command": "/tmp/create-socket"
    },
    {
      "id": "bind-socket",
      "section": "Socket APIs",
      "title": "Bind the socket to a local port",
      "file": "bind-socket.c",
      "focus": "unsigned short port =",
      "intro": "Give the UDP socket an address and port on loopback.",
      "question": "Where does the socket listen for datagrams after bind() succeeds?",
      "task": "Change port from 4040 to 4041 and run again. Compare the address and port before and after the change.",
      "hint": "Only the port changes. INADDR_LOOPBACK keeps the address at 127.0.0.1.",
      "explanation": "The first run binds 127.0.0.1:4040. Changing port binds 127.0.0.1:4041. htons() arranges the port’s bytes in the order the networking API expects.",
      "transfer": "What could cause bind() to fail even if socket() succeeded?",
      "reference": [
        "Read bind(2)",
        "https://man7.org/linux/man-pages/man2/bind.2.html"
      ],
      "prepare": "if [ ! -x /tmp/bind-socket ] || ! cmp -s /tmp/lesson-input/bind-socket.c /tmp/bind-socket.source; then\n    echo 'Compiling bind-socket.c in Linux'\n    gcc -std=c11 -Wall -Wextra -Werror /tmp/lesson-input/bind-socket.c -o /tmp/bind-socket.next\n    mv /tmp/bind-socket.next /tmp/bind-socket\n    cp /tmp/lesson-input/bind-socket.c /tmp/bind-socket.source\nfi",
      "command": "/tmp/bind-socket"
    },
    {
      "id": "socket-api",
      "section": "Socket APIs",
      "title": "Read the port Linux chose",
      "file": "socket-basics.c",
      "focus": "static int bind_loopback",
      "intro": "Linux socket APIs work with file descriptors. socket() creates a UDP endpoint. bind() assigns a local address and port, and getsockname() reports the address the kernel chose.",
      "question": "What local address and port does Linux assign when you request port zero?",
      "task": "Change requested_port from 0 to 4040. Run again and compare the requested port and the bound port.",
      "hint": "Port zero asks Linux to assign a free ephemeral port. htons() and ntohs() convert port numbers to and from network byte order.",
      "explanation": "A valid descriptor is a nonnegative integer. The first run shows an assigned port. The second run requests port 4040 explicitly.",
      "transfer": "Where would you inspect the error if another socket already held port 4040?",
      "reference": [
        "Read bind(2)",
        "https://man7.org/linux/man-pages/man2/bind.2.html"
      ],
      "prepare": "if [ ! -x /tmp/socket-basics ] || ! cmp -s /tmp/lesson-input/socket-basics.c /tmp/socket-basics.source; then\n    echo 'Compiling socket-basics.c in Linux'\n    gcc -std=c11 -Wall -Wextra -Werror  /tmp/lesson-input/socket-basics.c -o /tmp/socket-basics.next \n    mv /tmp/socket-basics.next /tmp/socket-basics\n    cp /tmp/lesson-input/socket-basics.c /tmp/socket-basics.source\nfi",
      "command": "/tmp/socket-basics socket"
    },
    {
      "id": "datagram-api",
      "section": "Socket APIs",
      "title": "Send and receive a UDP datagram",
      "file": "socket-basics.c",
      "focus": "static void send_datagram",
      "intro": "sendto() sends one datagram to a destination address. recvfrom() returns the number of bytes copied and can report the sender’s address.",
      "question": "How does the receiver find the sender’s port even though the sender never calls bind()?",
      "task": "Change message from ping to status. Run and compare the copied byte count and source port.",
      "hint": "The first send makes Linux choose a local address and port for the unbound sender.",
      "explanation": "The reply address is metadata returned by recvfrom(). The byte count is the size of the received payload, without a C string terminator.",
      "transfer": "How would you send a reply using the address and length returned by recvfrom()?",
      "reference": [
        "Read recvfrom(2)",
        "https://man7.org/linux/man-pages/man2/recvfrom.2.html"
      ],
      "prepare": "if [ ! -x /tmp/socket-basics ] || ! cmp -s /tmp/lesson-input/socket-basics.c /tmp/socket-basics.source; then\n    echo 'Compiling socket-basics.c in Linux'\n    gcc -std=c11 -Wall -Wextra -Werror  /tmp/lesson-input/socket-basics.c -o /tmp/socket-basics.next \n    mv /tmp/socket-basics.next /tmp/socket-basics\n    cp /tmp/lesson-input/socket-basics.c /tmp/socket-basics.source\nfi",
      "command": "/tmp/socket-basics datagram"
    },
    {
      "id": "listen-api",
      "section": "Socket APIs",
      "title": "Listen for and accept TCP connections",
      "file": "socket-basics.c",
      "focus": "static void accept_stream",
      "intro": "A server calls listen() to accept incoming TCP connections. connect() starts a client connection. accept() returns a new descriptor for one established connection.",
      "question": "Can the established connection still carry data after the listening descriptor closes?",
      "task": "Change payload from A to Z. Run and check both descriptor numbers and the received byte.",
      "hint": "The listening socket handles future arrivals. The accepted socket represents the data stream for one client.",
      "explanation": "The two descriptors refer to different sockets. Closing the listener prevents new accepts and leaves the accepted socket available.",
      "transfer": "Which descriptor should a server pass to recv() for each new connection?",
      "reference": [
        "Read accept(2)",
        "https://man7.org/linux/man-pages/man2/accept.2.html"
      ],
      "prepare": "if [ ! -x /tmp/socket-basics ] || ! cmp -s /tmp/lesson-input/socket-basics.c /tmp/socket-basics.source; then\n    echo 'Compiling socket-basics.c in Linux'\n    gcc -std=c11 -Wall -Wextra -Werror  /tmp/lesson-input/socket-basics.c -o /tmp/socket-basics.next \n    mv /tmp/socket-basics.next /tmp/socket-basics\n    cp /tmp/lesson-input/socket-basics.c /tmp/socket-basics.source\nfi",
      "command": "/tmp/socket-basics listen"
    },
    {
      "id": "addresses",
      "section": "Addressing and name resolution",
      "title": "Resolve a name into socket addresses",
      "intro": "A socket address combines an address family, a host address and a port. getaddrinfo() resolves a host and service into candidate addresses.",
      "question": "Which addresses can this guest use for localhost?",
      "focus": "static void addresses",
      "task": "Change AF_UNSPEC to AF_INET6 in addresses(), then run again. Compare the address families in the output.",
      "hint": "AF_UNSPEC accepts every available family. AF_INET6 restricts the query to IPv6.",
      "explanation": "The guest’s hosts file defines both loopback addresses. Restricting the family removes the IPv4 candidate. The service still resolves to port 8080.",
      "transfer": "Which field would you change to find UDP candidates for the same service?",
      "reference": [
        "Read getaddrinfo(3)",
        "https://man7.org/linux/man-pages/man3/getaddrinfo.3.html"
      ],
      "command": "/tmp/net addresses",
      "file": "network.c"
    },
    {
      "id": "ipv6",
      "section": "Addressing and name resolution",
      "title": "Exchange datagrams over IPv6 loopback",
      "file": "socket-tools.c",
      "focus": "static void ipv6_echo",
      "intro": "An IPv6 socket uses AF_INET6 and sockaddr_in6. Its loopback address is ::1. The server uses the source address returned by recvfrom() to reply.",
      "question": "Which fields describe an IPv6 socket endpoint, and which of them does the receiver get from recvfrom()?",
      "task": "Change payload in ipv6_echo() from 6 to V. Run and check the response and the peer address.",
      "hint": "The peer address and port are separate fields. The bracketed output keeps the port distinct from colons in the address.",
      "explanation": "Both datagrams travel through IPv6 loopback. IPv4 and IPv6 use different address structures even though the send and receive APIs are the same.",
      "transfer": "How would you pass an address candidate from getaddrinfo() to bind() without hard-coding a family?",
      "reference": [
        "Read ipv6(7)",
        "https://man7.org/linux/man-pages/man7/ipv6.7.html"
      ],
      "prepare": "if [ ! -x /tmp/socket-tools ] || ! cmp -s /tmp/lesson-input/socket-tools.c /tmp/socket-tools.source; then\n    echo 'Compiling socket-tools.c in Linux'\n    gcc -std=c11 -Wall -Wextra -Werror  /tmp/lesson-input/socket-tools.c -o /tmp/socket-tools.next -lresolv\n    mv /tmp/socket-tools.next /tmp/socket-tools\n    cp /tmp/lesson-input/socket-tools.c /tmp/socket-tools.source\nfi",
      "command": "/tmp/socket-tools ipv6"
    },
    {
      "id": "dns",
      "section": "Addressing and name resolution",
      "title": "Send a DNS question to a local resolver",
      "file": "socket-tools.c",
      "focus": "static const char dns_name",
      "intro": "DNS messages carry a transaction ID, a question and records. This lab sends a real UDP DNS packet to a local responder that serves the reserved test name echo.lab.test.",
      "question": "What distinguishes a response containing an IPv4 address from a response for a missing name?",
      "task": "Change dns_name to missing.lab.test. Run and compare the A record and its TTL with the NXDOMAIN result.",
      "hint": "The response repeats the transaction ID. The low four bits of the response flags hold the response code.",
      "explanation": "The existing name returns an A record with an IPv4 address and a time to live in seconds. NXDOMAIN reports that the requested name does not exist in the fixture.",
      "transfer": "Why must a resolver match the transaction ID and the answering peer before using a response?",
      "reference": [
        "Read the DNS message format in RFC 1035",
        "https://www.rfc-editor.org/rfc/rfc1035#section-4.1"
      ],
      "prepare": "if [ ! -x /tmp/socket-tools ] || ! cmp -s /tmp/lesson-input/socket-tools.c /tmp/socket-tools.source; then\n    echo 'Compiling socket-tools.c in Linux'\n    gcc -std=c11 -Wall -Wextra -Werror  /tmp/lesson-input/socket-tools.c -o /tmp/socket-tools.next -lresolv\n    mv /tmp/socket-tools.next /tmp/socket-tools\n    cp /tmp/lesson-input/socket-tools.c /tmp/socket-tools.source\nfi",
      "command": "/tmp/socket-tools dns"
    },
    {
      "id": "stream",
      "section": "Stream protocols",
      "title": "Read a TCP message in pieces",
      "intro": "TCP connects two sockets and delivers a stream of bytes. The client and server use the guest’s loopback interface, so the traffic remains on this machine.",
      "question": "The client writes two bytes before attempting the rest. How many can the server’s first recv() return?",
      "focus": "static void stream",
      "task": "Change SPLIT near the top of the file from 2 to 3. Run again and compare the first read with the final echo.",
      "hint": "The second send runs only after the first recv() returns. Find the receive loop that collects the remaining bytes.",
      "explanation": "The first read can see only bytes already sent. The receive loop tracks its offset and reconstructs all five bytes, regardless of where individual reads stop.",
      "transfer": "If the client sends all five bytes together, what must the receiver still do to handle a short read?",
      "reference": [
        "Read tcp(7)",
        "https://man7.org/linux/man-pages/man7/tcp.7.html"
      ],
      "command": "/tmp/net stream",
      "file": "network.c"
    },
    {
      "id": "frames",
      "section": "Stream protocols",
      "title": "Decode length-prefixed messages",
      "intro": "A frame is an application-defined message. Each frame here begins with a four-byte payload length in network byte order.",
      "question": "How does the receiver find both message boundaries on one connection?",
      "focus": "static void framing",
      "task": "Change the second frame from bye to goodbye and its length from 3 to 7. Run and inspect both decoded lengths and the last EOF line.",
      "hint": "The parser reads a complete header, checks the maximum length and then reads exactly that payload length.",
      "explanation": "Length prefixes tell the parser how many bytes to consume. EOF before a header starts is a clean end. EOF after part of a header or payload is a broken frame.",
      "transfer": "What should happen if a header announces LIMIT + 1 bytes and the peer sends nothing else?",
      "reference": [
        "Read byteorder(3)",
        "https://man7.org/linux/man-pages/man3/byteorder.3.html"
      ],
      "command": "/tmp/net frames",
      "file": "network.c"
    },
    {
      "id": "half-close",
      "section": "Stream protocols",
      "title": "Finish one direction of a connection",
      "intro": "A half-close ends the stream in one direction. SHUT_WR tells the peer that no more bytes will arrive from this sender.",
      "question": "Can the client still receive an acknowledgement after ending its request stream?",
      "focus": "static void half_close",
      "task": "Change the server acknowledgement to yes and its length to 3. Run and inspect the reported bytes in each direction.",
      "hint": "The client’s descriptor remains open. It stopped sending with shutdown(), then called recv() on that same descriptor.",
      "explanation": "The server reads the request and then sees EOF. The client’s receiving direction remains open for the acknowledgement.",
      "transfer": "How should a server respond to EOF if its length-prefixed request is incomplete?",
      "reference": [
        "Read shutdown(2)",
        "https://man7.org/linux/man-pages/man2/shutdown.2.html"
      ],
      "command": "/tmp/net half-close",
      "file": "network.c"
    },
    {
      "id": "udp",
      "section": "Datagrams and local sockets",
      "title": "Inspect UDP datagram boundaries",
      "intro": "UDP delivers datagrams. Each recvmsg() consumes one datagram, and MSG_TRUNC reports that the receive buffer was too small.",
      "question": "Will a second read return the remainder of the first datagram or the start of the next one?",
      "focus": "static void udp",
      "task": "Change the size of the data array in udp() from SPLIT to 8. Run and check both the copied byte count and the truncation flag.",
      "hint": "The sender issues two sendto() calls of five bytes each.",
      "explanation": "Each call consumes one datagram. With a two-byte buffer, both reads get the first two bytes of their own datagram. A large enough buffer preserves all five bytes.",
      "transfer": "How would the receiver distinguish one long datagram from two short ones?",
      "reference": [
        "Read udp(7)",
        "https://man7.org/linux/man-pages/man7/udp.7.html"
      ],
      "command": "/tmp/net udp",
      "file": "network.c"
    },
    {
      "id": "deadline",
      "section": "Datagrams and local sockets",
      "title": "Retry a UDP request after a deadline",
      "file": "socket-tools.c",
      "focus": "static void udp_deadline",
      "intro": "UDP does not retry unanswered requests for the application. poll() measures whether a reply arrived within a deadline, and a request ID lets the application match replies.",
      "question": "What does the client observe when the server deliberately drops the first reply?",
      "task": "Change answer_first_attempt to 1 in udp_deadline(). Run and compare the number of attempts.",
      "hint": "The test suppresses a reply in code. It uses the same loopback route in both cases.",
      "explanation": "The first configuration times out and sends a second ID. When the first reply is enabled, the client receives ID 1 and stops retrying.",
      "transfer": "How would you handle an old reply that arrives after you have already sent a newer request?",
      "reference": [
        "Read poll(2)",
        "https://man7.org/linux/man-pages/man2/poll.2.html"
      ],
      "prepare": "if [ ! -x /tmp/socket-tools ] || ! cmp -s /tmp/lesson-input/socket-tools.c /tmp/socket-tools.source; then\n    echo 'Compiling socket-tools.c in Linux'\n    gcc -std=c11 -Wall -Wextra -Werror  /tmp/lesson-input/socket-tools.c -o /tmp/socket-tools.next -lresolv\n    mv /tmp/socket-tools.next /tmp/socket-tools\n    cp /tmp/lesson-input/socket-tools.c /tmp/socket-tools.source\nfi",
      "command": "/tmp/socket-tools deadline"
    },
    {
      "id": "unix",
      "section": "Datagrams and local sockets",
      "title": "Pass a descriptor over a Unix-domain socket",
      "file": "socket-tools.c",
      "focus": "static void descriptor_message",
      "intro": "A Unix-domain socket connects processes on one machine. A control message with SCM_RIGHTS transfers a reference to an open file description through sendmsg() and recvmsg().",
      "question": "Can the receiving socket get a usable pipe descriptor after the sender closes its own descriptor?",
      "task": "Replace MSG_CMSG_CLOEXEC with 0 in recvmsg(). Run and check the flag reported for the received descriptor.",
      "hint": "The ancillary data is separate from the ordinary message payload. It carries a reference to the pipe, whose bytes remain available through the new descriptor.",
      "explanation": "The receiver reads the pipe even after the sender closed its handle. MSG_CMSG_CLOEXEC sets close-on-exec when Linux installs the received descriptor.",
      "transfer": "Why would sending the same descriptor number as ordinary text fail between two independent processes?",
      "reference": [
        "Read unix(7)",
        "https://man7.org/linux/man-pages/man7/unix.7.html"
      ],
      "prepare": "if [ ! -x /tmp/socket-tools ] || ! cmp -s /tmp/lesson-input/socket-tools.c /tmp/socket-tools.source; then\n    echo 'Compiling socket-tools.c in Linux'\n    gcc -std=c11 -Wall -Wextra -Werror  /tmp/lesson-input/socket-tools.c -o /tmp/socket-tools.next -lresolv\n    mv /tmp/socket-tools.next /tmp/socket-tools\n    cp /tmp/lesson-input/socket-tools.c /tmp/socket-tools.source\nfi",
      "command": "/tmp/socket-tools unix"
    },
    {
      "id": "connect-status",
      "section": "Readiness and scale",
      "title": "Check the result of a nonblocking connect",
      "file": "socket-tools.c",
      "focus": "static void connect_status",
      "intro": "A nonblocking connect() can return EINPROGRESS. poll() reports when connection setup finishes, and getsockopt(SO_ERROR) gives the outcome.",
      "question": "Can a connection failure also make the socket appear writable?",
      "task": "Set accept_connections to 0. Run and inspect the SO_ERROR message.",
      "hint": "The endpoint retains its port. Without listen(), no server is accepting TCP connections there.",
      "explanation": "A successful connection has SO_ERROR zero. A connection to the bound but non-listening port completes with ECONNREFUSED.",
      "transfer": "How would you distinguish a refusal from a connection attempt that outlives your own deadline?",
      "reference": [
        "Read connect(2)",
        "https://man7.org/linux/man-pages/man2/connect.2.html"
      ],
      "prepare": "if [ ! -x /tmp/socket-tools ] || ! cmp -s /tmp/lesson-input/socket-tools.c /tmp/socket-tools.source; then\n    echo 'Compiling socket-tools.c in Linux'\n    gcc -std=c11 -Wall -Wextra -Werror  /tmp/lesson-input/socket-tools.c -o /tmp/socket-tools.next -lresolv\n    mv /tmp/socket-tools.next /tmp/socket-tools\n    cp /tmp/lesson-input/socket-tools.c /tmp/socket-tools.source\nfi",
      "command": "/tmp/socket-tools connect"
    },
    {
      "id": "readiness",
      "section": "Readiness and scale",
      "title": "Wait for a nonblocking socket",
      "intro": "A nonblocking receive returns EAGAIN when the socket has nothing ready. poll() waits for a requested event or until its timeout.",
      "question": "What does poll() report on the same socket before and after the client writes?",
      "focus": "static void readiness",
      "task": "Change the data array in readiness() to eight bytes. Run and compare the idle and readable poll results.",
      "hint": "A readable event describes what an operation can do now. The following recv() still returns its actual byte count.",
      "explanation": "Idle poll returns zero. After the send, the same socket reports readable. The receive buffer limits how many bytes one call copies.",
      "transfer": "What other event besides new data can make recv() return immediately?",
      "reference": [
        "Read poll(2)",
        "https://man7.org/linux/man-pages/man2/poll.2.html"
      ],
      "command": "/tmp/net readiness",
      "file": "network.c"
    },
    {
      "id": "backpressure",
      "section": "Readiness and scale",
      "title": "Resume a write after backpressure",
      "intro": "Backpressure occurs when the sender has no more room to queue outgoing data. A nonblocking send() then returns EAGAIN.",
      "question": "Can the sender make progress after the receiving peer drains the queued bytes?",
      "focus": "static void backpressure",
      "task": "Change the requested SO_SNDBUF size from 4096 to 16384. Run and compare the bytes accepted before EAGAIN.",
      "hint": "The peer stays idle while the sender fills its queue. The count depends on the kernel’s socket buffering and TCP flow control.",
      "explanation": "Once the peer reads the queued bytes, the sender can wait for POLLOUT and retry. Real programs retain unsent bytes across retries and watch writability only while work is pending.",
      "transfer": "What should a sender do when send() accepts part of one message before the next call reports EAGAIN?",
      "reference": [
        "Read send(2)",
        "https://man7.org/linux/man-pages/man2/send.2.html"
      ],
      "command": "/tmp/net backpressure",
      "file": "network.c"
    },
    {
      "id": "epoll",
      "section": "Readiness and scale",
      "title": "Serve several TCP peers",
      "intro": "epoll tracks readiness across multiple descriptors. Each registered socket owns its own receive count. This lab uses level-triggered readiness on loopback.",
      "question": "Will one ready socket stop a second peer from receiving its echo?",
      "focus": "static void multiplex",
      "task": "Set PEERS to 3 near the top of the file. Predict the number of verified echoes, then run and inspect the per-peer totals.",
      "hint": "epoll_ctl() associates each socket with a peer index. A ready event can recur until its socket is drained.",
      "explanation": "The loop chooses a peer from each event and only updates that peer’s total. Each client checks its own complete echo before the program exits.",
      "transfer": "How would you replace the fixed payload length with a per-peer frame parser, and what extra state would you keep for each peer?",
      "reference": [
        "Read epoll(7)",
        "https://man7.org/linux/man-pages/man7/epoll.7.html"
      ],
      "command": "/tmp/net epoll",
      "file": "network.c"
    },
    {
      "id": "tls",
      "section": "Security and diagnostics",
      "title": "Verify a local TLS service by name",
      "file": "tls.c",
      "focus": "static const char expected_host",
      "intro": "TLS protects a byte stream and authenticates its peer. The client uses a bundled lab certificate authority to verify the server certificate and an expected DNS name.",
      "question": "What happens if the certificate is signed by the trusted lab CA but names a different host from the one the client expects?",
      "task": "Change expected_host to wrong.lab.test. Run and compare the successful encrypted echo with the rejected handshake.",
      "hint": "SSL_CTX_set_verify() enables peer verification. SSL_set1_host() specifies which name the certificate must match.",
      "explanation": "The starter verifies the certificate and echoes the message using the negotiated TLS version and cipher. A name mismatch stops the handshake before the client sends application data.",
      "transfer": "Which part of this test would also fail if the application loaded a different certificate authority?",
      "reference": [
        "Read OpenSSL hostname verification",
        "https://docs.openssl.org/3.5/man3/SSL_set1_host/"
      ],
      "assets": [
        "openssl-headers.tar.gz",
        "lab-ca.pem",
        "lab-server.pem",
        "lab-server-key.pem"
      ],
      "prepare": "mkdir -p /tmp/lab-openssl\nif [ ! -f /tmp/lab-openssl/openssl/ssl.h ]; then\n    tar -xzf /tmp/lesson-input/openssl-headers.tar.gz -C /tmp/lab-openssl\nfi\nif [ ! -x /tmp/linux-tls ] || ! cmp -s /tmp/lesson-input/tls.c /tmp/linux-tls.source; then\n    echo 'Compiling tls.c in Linux'\n    gcc -std=c11 -Wall -Wextra -Werror -I /tmp/lab-openssl /tmp/lesson-input/tls.c -o /tmp/linux-tls.next -l:libssl.so.3 -l:libcrypto.so.3\n    mv /tmp/linux-tls.next /tmp/linux-tls\n    cp /tmp/lesson-input/tls.c /tmp/linux-tls.source\nfi",
      "command": "cd /tmp/lesson-input\n/tmp/linux-tls"
    },
    {
      "id": "packets",
      "section": "Security and diagnostics",
      "title": "Read an IPv4 and UDP header on loopback",
      "file": "socket-tools.c",
      "focus": "static void observe_packets",
      "intro": "A Linux packet socket observes traffic at an interface. This program binds one to the guest’s loopback interface and looks for its own UDP datagram.",
      "question": "How many bytes do the IPv4 and UDP headers add to the payload?",
      "task": "Change payload in observe_packets() from capture to abc. Run and compare the payload, UDP length and IPv4 total length.",
      "hint": "UDP length includes its eight-byte header. The IPv4 total length also includes the IP header.",
      "explanation": "The generated datagram has real kernel-written headers. These length fields measure different ranges, so the three counts stay related as the payload changes.",
      "transfer": "Which field would you check before deciding where the UDP header starts if the IPv4 header included options?",
      "reference": [
        "Read packet(7)",
        "https://man7.org/linux/man-pages/man7/packet.7.html"
      ],
      "assets": [
        "af_packet.ko.gz"
      ],
      "prepare": "if [ ! -x /tmp/socket-tools ] || ! cmp -s /tmp/lesson-input/socket-tools.c /tmp/socket-tools.source; then\n    echo 'Compiling socket-tools.c in Linux'\n    gcc -std=c11 -Wall -Wextra -Werror  /tmp/lesson-input/socket-tools.c -o /tmp/socket-tools.next -lresolv\n    mv /tmp/socket-tools.next /tmp/socket-tools\n    cp /tmp/lesson-input/socket-tools.c /tmp/socket-tools.source\nfi",
      "command": "if ! grep -q '^af_packet ' /proc/modules; then\n    gzip -dc /tmp/lesson-input/af_packet.ko.gz >/tmp/lab-af-packet.ko\n    insmod /tmp/lab-af-packet.ko\nfi\n/tmp/socket-tools packet"
    },
    {
      "id": "capstone",
      "section": "Capstone",
      "title": "Verify a framed TCP service end to end",
      "intro": "A child process runs a framed echo server. Its client verifies a text frame, an empty frame and the end of the stream on each connection.",
      "question": "How can the client tell an empty frame from the orderly end of the connection?",
      "focus": "static void framed_session",
      "task": "Set PEERS to 3, then change payload from hello to a longer string under LIMIT. Run and verify that each client still checks both frames and EOF.",
      "hint": "Look at the four-byte header. An empty frame has a complete header announcing zero payload bytes. EOF between frames has no header.",
      "explanation": "The child handles each accepted connection until the peer half-closes. Every client checks both boundaries before the parent collects the server’s exit status.",
      "transfer": "Use the epoll lesson to design a version that retains independent header, body and write offsets for each connected client.",
      "reference": [
        "Read recv(2)",
        "https://man7.org/linux/man-pages/man2/recv.2.html"
      ],
      "command": "/tmp/net capstone",
      "file": "network.c"
    }
  ]
};
