# Course review

The Sites design guidance and the streaming lab’s UX and learning-design guides informed the workbench. The chapter sequence asks a Linux question, exposes the relevant editable C, shows actual guest output, suggests a small change and asks a separate transfer question. Each lesson links to a primary Linux reference.

The built Pages site passed automated navigation and horizontal-overflow checks at 1440, 768 and 390 pixels in both themes. `npm run check` validates 9 lesson entries, source focus locations and the generated offline inventory, including the kernel, guest image and WebAssembly emulator.

The course uses a real Alpine x86 guest. The TCP short read is an executable program, and the guest's timings depend on the host, browser and emulator. Offline use requires saving the course in that browser profile before disconnecting.
