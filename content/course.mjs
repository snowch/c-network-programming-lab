export const course = {
  "slug": "c-network-programming-lab",
  "title": "C Network Programming Lab",
  "summary": "Linux sockets, TCP and UDP, framing, readiness and multiplexing.",
  "instructions": "Run in Linux compiles the editor contents with GCC and runs this exercise in the guest. Use the console output to check your prediction.",
  "files": {
    "network.c": "./examples/network.c"
  },
  "prepare": "set -e\ngcc -std=c11 -Wall -Wextra -Werror -O2 /tmp/lesson-input/network.c -o /tmp/net",
  "lessons": [
    {
      "id": "addresses",
      "section": "Addressing and transport",
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
      "id": "stream",
      "section": "Addressing and transport",
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
      "id": "udp",
      "section": "Addressing and transport",
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
