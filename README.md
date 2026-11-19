# C Network Programming Lab

Copyright © 2026 Christopher Snow.

[Open the course](https://snowch.github.io/c-network-programming-lab/). Linux sockets, TCP and UDP, framing, readiness and multiplexing. Know basic C and how to read a shell command.

Each lesson includes editable C source, a runnable experiment, a code change, a hint and a transfer question. **Run in Linux** compiles the source with GCC and executes it in a self-hosted Alpine Linux guest using WebAssembly. The browser saves source changes per lesson. Reset Linux starts a fresh guest and keeps the editor changes.

Choose **Download for offline use** before disconnecting. Save roughly 145 MB of free browser storage for this course. Open the same URL in the same browser profile after the page reports **Available offline**. The lesson files, editor, compiler, kernel and runtime are included. External documentation requires an internet connection. HTTPS or localhost and a browser with WebAssembly and service workers are required.

## Lessons

- [Resolve a name into socket addresses](https://snowch.github.io/c-network-programming-lab/#addresses)
- [Read a TCP message in pieces](https://snowch.github.io/c-network-programming-lab/#stream)
- [Inspect UDP datagram boundaries](https://snowch.github.io/c-network-programming-lab/#udp)
- [Decode length-prefixed messages](https://snowch.github.io/c-network-programming-lab/#frames)
- [Finish one direction of a connection](https://snowch.github.io/c-network-programming-lab/#half-close)
- [Wait for a nonblocking socket](https://snowch.github.io/c-network-programming-lab/#readiness)
- [Resume a write after backpressure](https://snowch.github.io/c-network-programming-lab/#backpressure)
- [Serve several TCP peers](https://snowch.github.io/c-network-programming-lab/#epoll)
- [Verify a framed TCP service end to end](https://snowch.github.io/c-network-programming-lab/#capstone)

## Develop

Use Node.js 22 or later. Run `npm run check` to build and validate the course. Run `npm run dev` to serve it at http://localhost:4173. GitHub Actions publishes `dist/` to Pages. Original source is in `examples/`, chapter content in `content/course.mjs`, and guest build notes in [runtime/README.md](runtime/README.md).

This course uses the chapter structure, typography and build conventions of [GPU Lab](https://github.com/snowch/gpu-lab).
