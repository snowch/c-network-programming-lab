# C Network Programming Lab

Copyright © 2026 Christopher Snow.

[Open the course](https://snowch.github.io/c-network-programming-lab/). You should be able to read a small C function with variables, arrays, pointers and return values. Start with Linux socket APIs, then build transport protocols and diagnose real local exchanges.

Each lesson includes editable C source, a runnable experiment, a code change, a hint and a transfer question. **Run in Linux** starts the bundled Alpine guest when needed, compiles new or changed source with GCC and runs the experiment. Source changes are saved per lesson when browser storage is available. If the page reports a storage failure, use **Download source** to keep the copy in this tab. **Reset Linux** clears guest files and keeps the editor changes. The next run boots a fresh guest.

Choose **Download for offline use** before disconnecting. Save roughly 145 MB of free browser storage for this course. Open the same URL in the same browser profile after the page reports **Available offline**. The lesson files, editor, compiler, kernel and runtime are included. External documentation requires an internet connection. HTTPS or localhost and a browser with WebAssembly and service workers are required.

## Lessons

### Socket APIs

- [Create and bind a socket](https://snowch.github.io/c-network-programming-lab/#socket-api)
- [Send and receive a UDP datagram](https://snowch.github.io/c-network-programming-lab/#datagram-api)
- [Listen for and accept TCP connections](https://snowch.github.io/c-network-programming-lab/#listen-api)

### Addressing and name resolution

- [Resolve a name into socket addresses](https://snowch.github.io/c-network-programming-lab/#addresses)
- [Exchange datagrams over IPv6 loopback](https://snowch.github.io/c-network-programming-lab/#ipv6)
- [Send a DNS question to a local responder](https://snowch.github.io/c-network-programming-lab/#dns)

### Stream protocols

- [Read a TCP message in pieces](https://snowch.github.io/c-network-programming-lab/#stream)
- [Decode length-prefixed messages](https://snowch.github.io/c-network-programming-lab/#frames)
- [Finish one direction of a connection](https://snowch.github.io/c-network-programming-lab/#half-close)

### Datagrams and local sockets

- [Inspect UDP datagram boundaries](https://snowch.github.io/c-network-programming-lab/#udp)
- [Retry a UDP request after a deadline](https://snowch.github.io/c-network-programming-lab/#deadline)
- [Pass a descriptor over a Unix-domain socket](https://snowch.github.io/c-network-programming-lab/#unix)

### Readiness and scale

- [Check the result of a nonblocking connect](https://snowch.github.io/c-network-programming-lab/#connect-status)
- [Wait for a nonblocking socket](https://snowch.github.io/c-network-programming-lab/#readiness)
- [Resume a write after backpressure](https://snowch.github.io/c-network-programming-lab/#backpressure)
- [Serve several TCP peers](https://snowch.github.io/c-network-programming-lab/#epoll)

### Security and diagnostics

- [Verify a local TLS service by name](https://snowch.github.io/c-network-programming-lab/#tls)
- [Read an IPv4 and UDP header on loopback](https://snowch.github.io/c-network-programming-lab/#packets)

### Capstone

- [Verify a framed TCP service end to end](https://snowch.github.io/c-network-programming-lab/#capstone)

## Scope

Every packet stays inside the guest. DNS and TLS use bundled fixtures, and packet observation is limited to loopback. The TLS key and CA are generated for this course. The guest cannot observe real network paths, measure physical latency or diagnose public DNS infrastructure.

## Develop

Use Node.js 22 or later. Run `npm run check` to build and validate the course. Run `npm run dev` to serve it at http://localhost:4173. GitHub Actions publishes `dist/` to Pages. Original source is in `examples/`, chapter content in `content/course.mjs`, and guest build notes in [runtime/README.md](runtime/README.md).

This course uses the chapter structure, typography and build conventions of [GPU Lab](https://github.com/snowch/gpu-lab).
