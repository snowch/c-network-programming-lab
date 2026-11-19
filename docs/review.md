# Course review

The Sites design guidance and the streaming lab’s UX and learning-design guides informed the workbench. The chapter sequence asks a Linux question, exposes the relevant editable C, shows actual guest output, suggests a small change and asks a separate transfer question. Each lesson links to a primary Linux reference.

The lesson picker, previous and next navigation, and browser drafts were checked on the published single-column workbench. Width checks included 1280, 768, 390 and 320 pixels. `npm run check` validates 19 lessons, source focus locations and the offline inventory. The expanded examples were run in the packaged Alpine guest without an external network.

The course uses a real Alpine x86 guest. The TCP short read is an executable program, and the guest's timings depend on the host, browser and emulator. Offline use requires saving the course in that browser profile before disconnecting.
