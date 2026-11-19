export const concepts = {
  "create-socket": {
    title: "How a socket gets a descriptor",
    nodes: [
      ["C program", "socket(AF_INET, SOCK_DGRAM, 0)"],
      ["Linux", "Creates an IPv4 UDP socket"],
      ["Process table", "fd 3 → socket"]
    ],
    caption: "The descriptor is a process-local handle. No local port has been assigned yet."
  },
  "bind-socket": {
    title: "What bind() changes",
    nodes: [
      ["Before", "fd 3 → unbound socket"],
      ["bind()", "Pass 127.0.0.1:4040"],
      ["After", "fd 3 → 127.0.0.1:4040"]
    ],
    caption: "The descriptor stays the same. Linux associates that local address and port with the socket so traffic can reach it."
  },
  "socket-api": {
    title: "Request a port, then read it back",
    nodes: [
      ["Request", "bind on port 0"],
      ["Linux", "Selects an available nonzero port"],
      ["Inspect", "getsockname fills the address"]
    ],
    caption: "Keep the returned address for the sender. The number you requested is still zero."
  },
  "datagram-api": {
    title: "Follow one UDP datagram",
    nodes: [
      ["Sender", "sendto includes destination"],
      ["UDP socket", "Receives one datagram"],
      ["Receiver", "recvfrom returns bytes and source"]
    ],
    caption: "The destination tells Linux where to deliver the datagram. The source gives the receiver an address it can reply to."
  },
  "listen-api": {
    title: "The TCP three-way handshake",
    nodes: [
      ["Client → listener", "SYN · connect() starts"],
      ["Listener → client", "SYN-ACK"],
      ["Client → listener", "ACK · connection established"]
    ],
    caption: "Linux exchanges these packets. accept() returns a new descriptor for a completed connection while the listener can accept more."
  },
  "socket-apis-capstone": {
    title: "One request, two endpoints",
    nodes: [
      ["Server", "bind to port 0 and query it"],
      ["Client → server", "sendto sends ping"],
      ["Server → client", "recvfrom supplies the return address"]
    ],
    caption: "The server replies to the address it observed. The client verifies the reply and its source."
  },
  "addresses": {
    title: "Separate lookup from socket creation",
    nodes: [
      ["Input", "Host, service and hints"],
      ["getaddrinfo()", "Returns candidate addresses"],
      ["Application", "Chooses a result and frees the list"]
    ],
    caption: "A result describes how to create or use an endpoint. The lookup leaves all socket creation to the caller."
  },
  "ipv6": {
    title: "The same UDP exchange on IPv6",
    nodes: [
      ["Create", "AF_INET6 + SOCK_DGRAM"],
      ["Bind", "sockaddr_in6 with ::1"],
      ["Exchange", "sendto and recvfrom"]
    ],
    caption: "The address type and family change. The datagram send and receive calls work with either IP family."
  },
  "dns": {
    title: "Match a DNS question to its response",
    nodes: [
      ["Query", "Name, type and transaction ID"],
      ["Responder", "Resource record or response code"],
      ["Client", "Checks ID and parses answer"]
    ],
    caption: "An A answer carries IPv4 data and a TTL. NXDOMAIN is a DNS result, distinct from a socket timeout."
  },
  "addressing-capstone": {
    title: "From a name to a working IPv6 endpoint",
    nodes: [
      ["Resolve", "localhost → ::1 with port 0"],
      ["Bind and inspect", "[::1] with a chosen port"],
      ["Exchange", "Datagram reaches that endpoint"]
    ],
    caption: "Resolution supplies the address. Binding chooses the available port, which the sender reads before sending."
  },
  "first-recv": {
    title: "Buffer size sets an upper limit",
    nodes: [
      ["Sender", "Writes 2 bytes"],
      ["Receiver buffer", "Capacity 5 bytes"],
      ["recv()", "Returns 2 bytes in this run"]
    ],
    caption: "A blocking receive can return as soon as bytes are available. Use its returned count to know what was filled."
  },
  "stream": {
    title: "Build up one TCP message",
    nodes: [
      ["First read", "Buffer starts with he"],
      ["Continue", "Advance offset by bytes copied"],
      ["Full message", "hello, then echo"]
    ],
    caption: "A receive loop tracks bytes left. TCP does not supply a separate message boundary for each send."
  },
  "frames": {
    title: "Give a stream its own message boundaries",
    nodes: [
      ["Header", "4 bytes · payload length"],
      ["Validation", "Reject sizes beyond the limit"],
      ["Body", "Read exactly that many bytes"]
    ],
    caption: "EOF is valid between frames. EOF in a partial header or body means the frame is incomplete."
  },
  "half-close": {
    title: "Close just one direction",
    nodes: [
      ["Client → server", "Request bytes"],
      ["Client SHUT_WR", "Server sees EOF after reading them"],
      ["Server → client", "Reply still flows"]
    ],
    caption: "The write shutdown marks the end of one byte stream. The client’s read side stays available."
  },
  "stream-capstone": {
    title: "A framed request followed by EOF",
    nodes: [
      ["Sender", "Length prefix + first piece"],
      ["Receiver", "Read the remaining payload"],
      ["Half-close and reply", "EOF then reverse traffic"]
    ],
    caption: "The length completes the message. EOF ends the request stream. The reply uses the opposite direction."
  },
  "udp": {
    title: "A datagram has its own boundary",
    nodes: [
      ["Sender", "Sends hello in one datagram"],
      ["Receive buffer", "Holds two bytes"],
      ["Result", "he + MSG_TRUNC"]
    ],
    caption: "The next receive starts on the next datagram. The rest of hello has already been discarded."
  },
  "deadline": {
    title: "A deadline belongs to an attempt",
    nodes: [
      ["Request 1", "Send ID 1"],
      ["poll()", "Returns 0 after the wait"],
      ["Request 2", "Check reply carries ID 2"]
    ],
    caption: "A timeout reports that the wait ended without readiness. The reply’s ID tells you which request it answers."
  },
  "unix": {
    title: "Pass a reference to the same object",
    nodes: [
      ["Sender’s fd", "Refers to an open pipe"],
      ["Unix message", "SCM_RIGHTS control data"],
      ["Receiver’s fd", "Refers to the same pipe"]
    ],
    caption: "The receiver gets its own descriptor number. Reading it accesses the original open object."
  },
  "datagram-capstone": {
    title: "Move ownership of the UDP endpoint",
    nodes: [
      ["First descriptor", "Bound to loopback"],
      ["Handoff", "Unix socket queues SCM_RIGHTS"],
      ["New descriptor", "Waits and receives the datagram"]
    ],
    caption: "Closing the original descriptor leaves the socket alive while a reference is in transit or held by the receiver."
  },
  "connect-status": {
    title: "Read the outcome after a nonblocking connect",
    nodes: [
      ["connect()", "Returns EINPROGRESS"],
      ["poll()", "Reports a completion event"],
      ["SO_ERROR", "0 or an error such as ECONNREFUSED"]
    ],
    caption: "Writability means the attempt completed. The socket’s pending error distinguishes success from failure."
  },
  "readiness": {
    title: "Wait without repeatedly trying recv()",
    nodes: [
      ["Empty socket", "Nonblocking recv returns EAGAIN"],
      ["poll(POLLIN)", "Waits for input"],
      ["recv()", "Returns the actual byte count"]
    ],
    caption: "poll reports a condition. recv is the operation that copies bytes or reports EOF."
  },
  "backpressure": {
    title: "Keep your place when a send stalls",
    nodes: [
      ["Send loop", "Advances by accepted bytes"],
      ["Buffer fills", "EAGAIN with data left"],
      ["Peer drains", "POLLOUT, then retry remainder"]
    ],
    caption: "Keep the unsent offset. Readiness is a reason to retry, and the next write can still be short."
  },
  "epoll": {
    title: "One wait, separate progress for each client",
    nodes: [
      ["Register", "Store a client index in each event"],
      ["epoll_wait()", "Returns the ready indices"],
      ["Handle one client", "Update only its progress counter"]
    ],
    caption: "One ready peer may have part of a message. Each connection keeps its own byte count and state."
  },
  "tls": {
    title: "The TLS handshake over TCP",
    nodes: [
      ["Client → server", "ClientHello offers protocol options"],
      ["Server → client", "ServerHello and certificate"],
      ["Client verifies", "Trusted signer and expected name before echo"]
    ],
    caption: "The handshake also establishes keys. Certificate and name checks must succeed before this client sends application bytes."
  },
  "packets": {
    title: "Read nested lengths from an IPv4 datagram",
    nodes: [
      ["IPv4 header", "Total length includes IPv4 header"],
      ["UDP header", "UDP length includes its own header"],
      ["Application data", "UDP length minus UDP header"]
    ],
    caption: "Use the IPv4 header length field to locate UDP. Payload length comes from the UDP length and header size."
  },
  "tls-diagnostics-capstone": {
    title: "Compare transport evidence and identity evidence",
    nodes: [
      ["TCP socket", "Client port → server port"],
      ["Loopback packet", "Shows that same pair of ports"],
      ["TLS outcome", "Verified echo or name mismatch"]
    ],
    caption: "A TCP packet proves transport activity. The TLS result tells you whether the client accepted the peer identity."
  },
  "capstone": {
    title: "Check text, empty frame and EOF",
    nodes: [
      ["Client", "Sends a text frame then an empty frame"],
      ["Server", "Echoes both frames until request EOF"],
      ["Client", "Reads both frames then verifies EOF"]
    ],
    caption: "An empty frame still has a four-byte header with length zero. EOF is a separate result from a later read."
  },
};
