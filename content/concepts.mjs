export const concepts = {
  "create-socket": {
    title: "How a socket gets a descriptor",
    visual: {
      kind: "layers",
      layers: [
        ["C program","socket()","AF_INET, SOCK_DGRAM, 0"],
        ["Kernel","UDP socket","IPv4 endpoint with no local port assigned"],
        ["Process table","fd 3","An example descriptor referring to that socket"],
      ],
      crossings: ["System call","Return descriptor"],
    },
    caption: "The descriptor is a process-local handle. No local port has been assigned yet.",
  },
  "bind-socket": {
    title: "What bind() changes",
    visual: {
      kind: "state",
      identity: "The same IPv4 UDP socket",
      before: ["Before","fd → socket with no assigned local port"],
      action: "bind(fd, …)",
      after: ["After","fd → socket bound to 127.0.0.1:4040"],
    },
    caption: "The descriptor stays the same. Linux associates that local address and port with the socket so traffic can reach it.",
  },
  "socket-api": {
    title: "Request a port, then read it back",
    visual: {
      kind: "state",
      identity: "One socket and its local endpoint",
      before: ["Requested endpoint","127.0.0.1:0"],
      action: "bind() then getsockname()",
      after: ["Actual endpoint","127.0.0.1 with a Linux-assigned port"],
    },
    caption: "Keep the returned address for the sender. The number you requested is still zero.",
  },
  "datagram-api": {
    title: "Follow one UDP datagram",
    visual: {
      kind: "sequence",
      participants: ["Sender","Receiver"],
      messages: [
        ["local-right","bind()","Receiver has a local IPv4 address and port"],
        ["right","UDP datagram · ping","sendto() names the receiver’s endpoint"],
        ["local-right","recvfrom()","Copies the bytes and returns the sender’s address"],
      ],
    },
    caption: "The destination tells Linux where to deliver the datagram. The source gives the receiver an address it can reply to.",
  },
  "listen-api": {
    title: "The TCP three-way handshake",
    visual: {
      kind: "sequence",
      participants: ["TCP client","TCP listener"],
      messages: [
        ["local-right","listen()","Ready to accept incoming connections"],
        ["right","SYN","connect() starts the handshake"],
        ["left","SYN-ACK","Server acknowledges the client’s SYN"],
        ["right","ACK","Client acknowledges the server’s SYN"],
        ["local-right","accept()","A new descriptor refers to the connection"],
      ],
    },
    caption: "Linux exchanges these packets. accept() returns a new descriptor for a completed connection while the listener can accept more.",
  },
  "socket-apis-capstone": {
    title: "One request, two endpoints",
    visual: {
      kind: "sequence",
      participants: ["UDP client","UDP server"],
      messages: [
        ["local-right","bind(… port 0)","getsockname() reads the assigned address and port"],
        ["right","ping","sendto() uses the server’s assigned endpoint"],
        ["left","pong","The return address comes from recvfrom()"],
        ["local-left","Verify reply","Compare the payload and source endpoint"],
      ],
    },
    caption: "The server replies to the address it observed. The client verifies the reply and its source.",
  },
  "addresses": {
    title: "Separate lookup from socket creation",
    nodes: [
      ["Input","Host, service and hints"],
      ["getaddrinfo()","Returns candidate addresses"],
      ["Application","Chooses a result and frees the list"],
    ],
    caption: "A result describes how to create or use an endpoint. The lookup leaves all socket creation to the caller.",
  },
  "ipv6": {
    title: "The same UDP exchange on IPv6",
    visual: {
      kind: "sequence",
      participants: ["IPv6 client","IPv6 receiver"],
      messages: [
        ["local-right","bind()","AF_INET6 datagram endpoint on [::1]"],
        ["right","UDP byte · 6","recvfrom() records the client’s sockaddr_in6"],
        ["left","UDP reply · 6","sendto() reuses that IPv6 address"],
      ],
    },
    caption: "The address type and family change. The datagram send and receive calls work with either IP family.",
  },
  "dns": {
    title: "Match a DNS question to its response",
    visual: {
      kind: "sequence",
      participants: ["DNS client","Local responder"],
      messages: [
        ["right","DNS query","Question name, type A and transaction ID"],
        ["left","DNS response","Same ID. A record with a TTL or an error code"],
        ["local-left","Check the response","Match the ID before interpreting the answer"],
      ],
    },
    caption: "An A answer carries IPv4 data and a TTL. NXDOMAIN is a DNS result, distinct from a socket timeout.",
  },
  "addressing-capstone": {
    title: "From a name to a working IPv6 endpoint",
    nodes: [
      ["Resolve","localhost → ::1 with port 0"],
      ["Bind and inspect","[::1] with a chosen port"],
      ["Exchange","Datagram reaches that endpoint"],
    ],
    caption: "Resolution supplies the address. Binding chooses the available port, which the sender reads before sending.",
  },
  "first-recv": {
    title: "Buffer size sets an upper limit",
    visual: {
      kind: "bytes",
      bands: [
        {"label":"Copied by recv()","cells":["h","e"],"tone":"data","note":"2 bytes returned"},
        {"label":"Unused buffer space","cells":["—","—","—"],"tone":"pending","note":"Room for 3 more bytes"},
      ],
      result: ["Buffer capacity","5 bytes"],
    },
    caption: "A blocking receive can return as soon as bytes are available. Use its returned count to know what was filled.",
  },
  "stream": {
    title: "Build up one TCP message",
    visual: {
      kind: "bytes",
      bands: [
        {"label":"First recv()","cells":["h","e"],"tone":"data","note":"Offset advances by 2"},
        {"label":"Later reads","cells":["l","l","o"],"tone":"pending","note":"The rest arrives after the first call"},
      ],
      result: ["Assembled message","hello"],
    },
    caption: "A receive loop tracks bytes left. TCP does not supply a separate message boundary for each send.",
  },
  "frames": {
    title: "Give a stream its own message boundaries",
    visual: {
      kind: "bytes",
      bands: [
        {"label":"4-byte header","cells":["00","00","00","05"],"tone":"head","note":"Length = 5 in network byte order"},
        {"label":"5-byte payload","cells":["h","e","l","l","o"],"tone":"data","note":"Read until all 5 bytes arrive"},
      ],
      result: ["Frame boundary","A new header can start after the last o."],
    },
    caption: "EOF is valid between frames. EOF in a partial header or body means the frame is incomplete.",
  },
  "half-close": {
    title: "Close just one direction",
    visual: {
      kind: "sequence",
      participants: ["Client","Server"],
      messages: [
        ["right","Request bytes","Client sends hello"],
        ["right","FIN","shutdown(SHUT_WR) ends this direction"],
        ["local-right","recv() reaches EOF","The request bytes were already delivered"],
        ["left","Reply bytes · ok","The client can still receive the reply"],
      ],
    },
    caption: "The write shutdown marks the end of one byte stream. The client’s read side stays available.",
  },
  "stream-capstone": {
    title: "A framed request followed by EOF",
    visual: {
      kind: "sequence",
      participants: ["Client","Server"],
      messages: [
        ["right","Length + first piece","The prefix says how many payload bytes to expect"],
        ["right","Remaining payload","Server reads until the frame is complete"],
        ["right","FIN","The write half-close lets the server observe EOF"],
        ["left","Echo","Client verifies the reply on the open read side"],
      ],
    },
    caption: "The length completes the message. EOF ends the request stream. The reply uses the opposite direction.",
  },
  "udp": {
    title: "A datagram has its own boundary",
    visual: {
      kind: "bytes",
      bands: [
        {"label":"Copied","cells":["h","e"],"tone":"data","note":"Receive buffer holds 2 bytes"},
        {"label":"Discarded","cells":["l","l","o"],"tone":"discarded","note":"These bytes belonged to the same datagram"},
      ],
      result: ["MSG_TRUNC","The next receive starts with a new datagram."],
    },
    caption: "The next receive starts on the next datagram. The rest of hello has already been discarded.",
  },
  "deadline": {
    title: "A deadline belongs to an attempt",
    visual: {
      kind: "sequence",
      participants: ["Client","UDP responder"],
      messages: [
        ["right","Request 1","ID = 1"],
        ["local-left","poll() → 0","No reply becomes readable before the deadline"],
        ["right","Request 2","ID = 2"],
        ["left","Reply 2","Match the ID to the current attempt"],
      ],
    },
    caption: "A timeout reports that the wait ended without readiness. The reply’s ID tells you which request it answers.",
  },
  "unix": {
    title: "Pass a reference to the same object",
    visual: {
      kind: "object",
      sources: [
        ["Sender’s fd","Held before SCM_RIGHTS"],
        ["Receiver’s fd","Installed by recvmsg()"],
      ],
      target: ["The same open pipe","Two processes can use their own descriptor number to access it."],
      field: ["Transferred value","Reference"],
    },
    caption: "The receiver gets its own descriptor number. Reading it accesses the original open object.",
  },
  "datagram-capstone": {
    title: "Move ownership of the UDP endpoint",
    visual: {
      kind: "object",
      sources: [
        ["Original fd","Closed after sendmsg()"],
        ["Received fd","Installed by SCM_RIGHTS"],
      ],
      target: ["The same bound UDP socket","Pending datagrams and the local port stay with the socket."],
      field: ["Next operation","poll() → recvmsg()"],
    },
    caption: "Closing the original descriptor leaves the socket alive while a reference is in transit or held by the receiver.",
  },
  "connect-status": {
    title: "Read the outcome after a nonblocking connect",
    visual: {
      kind: "compare",
      cases: [
        {"label":"Connection succeeded","facts":[["connect()","EINPROGRESS"],["poll()","Completion event"],["SO_ERROR","0"]]},
        {"label":"Connection refused","facts":[["connect()","EINPROGRESS"],["poll()","Completion event"],["SO_ERROR","ECONNREFUSED"]]},
      ],
    },
    caption: "Writability means the attempt completed. The socket’s pending error distinguishes success from failure.",
  },
  "readiness": {
    title: "Wait without repeatedly trying recv()",
    visual: {
      kind: "compare",
      cases: [
        {"label":"Before the sender writes","facts":[["recv(MSG_DONTWAIT)","EAGAIN"],["poll(POLLIN)","0 · timed out"]]},
        {"label":"After the sender writes","facts":[["poll(POLLIN)","POLLIN · readable"],["recv()","Actual bytes copied"]]},
      ],
    },
    caption: "poll reports a condition. recv is the operation that copies bytes or reports EOF.",
  },
  "backpressure": {
    title: "Keep your place when a send stalls",
    visual: {
      kind: "queue",
      writer: ["Sender","Remember the unsent offset"],
      name: "TCP send buffer",
      cells: ["a","b","c","d"],
      reader: ["Peer reads","Frees room as data drains"],
      signal: ["POLLOUT","Retry from the saved offset. The next send can still be short."],
    },
    caption: "Keep the unsent offset. Readiness is a reason to retry, and the next write can still be short.",
  },
  "epoll": {
    title: "One wait, separate progress for each client",
    visual: {
      kind: "object",
      sources: [
        ["Peer 0","Registration stores index 0"],
        ["Peer 1","Registration stores index 1"],
      ],
      target: ["One epoll instance","epoll_wait() returns events for the ready sockets."],
      field: ["Per-peer state","Separate byte counts"],
    },
    caption: "One ready peer may have part of a message. Each connection keeps its own byte count and state.",
  },
  "tls": {
    title: "The TLS handshake over TCP",
    visual: {
      kind: "sequence",
      participants: ["TLS client","TLS server"],
      messages: [
        ["right","ClientHello","Offers protocol options and a key share"],
        ["left","ServerHello","Selects options and sends its key share"],
        ["left","Certificate · CertificateVerify · Finished","TLS 1.3 authenticates the server and its handshake transcript"],
        ["local-left","Verify trust and name","The lab checks the CA and expected hostname"],
        ["right","Client Finished","Confirms the client’s view of the handshake"],
        ["right","Encrypted request","Application data follows the handshake"],
      ],
    },
    caption: "This diagram shows the TLS 1.3 exchange. In the starter, SSL_connect() completes peer verification before SSL_write_ex() sends the request.",
  },
  "packets": {
    title: "Read nested lengths from an IPv4 datagram",
    visual: {
      kind: "bytes",
      bands: [
        {"label":"IPv4 header","width":20,"value":"20 B","tone":"head","note":"IHL locates UDP"},
        {"label":"UDP header","width":8,"value":"8 B","tone":"pending","note":"Included in UDP length"},
        {"label":"Payload","width":7,"value":"7 B","tone":"data","note":"Application bytes"},
      ],
      result: ["Starter lengths","IPv4 total 35 bytes · UDP total 15 bytes"],
    },
    caption: "Use the IPv4 header length field to locate UDP. Payload length comes from the UDP length and header size.",
  },
  "tls-diagnostics-capstone": {
    title: "Compare transport evidence and identity evidence",
    visual: {
      kind: "compare",
      cases: [
        {"label":"Matching certificate name","facts":[["Packet observation","Matching TCP port pair"],["TLS result","Name verified"],["Application","Encrypted echo"]]},
        {"label":"Wrong certificate name","facts":[["Packet observation","Matching TCP port pair"],["TLS result","Name mismatch"],["Application","Echo withheld"]]},
      ],
    },
    caption: "A TCP packet proves transport activity. The TLS result tells you whether the client accepted the peer identity.",
  },
  "capstone": {
    title: "Check text, empty frame and EOF",
    visual: {
      kind: "sequence",
      participants: ["Framed client","Echo server"],
      messages: [
        ["right","Length 5 + hello","One text frame"],
        ["right","Length 0","An empty frame still has a header"],
        ["right","Write half-close","Server observes request EOF"],
        ["left","Two echoed frames","Client checks both frame boundaries"],
        ["left","Server closes","A later client read returns zero"],
      ],
    },
    caption: "An empty frame still has a four-byte header with length zero. EOF is a separate result from a later read.",
  },
};
