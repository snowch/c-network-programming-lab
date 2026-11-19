# Course review

The Sites design guidance and the streaming lab’s UX and learning-design guides informed the workbench. The chapter sequence asks a Linux question, exposes the relevant editable C, shows actual guest output, suggests a small change and asks a separate transfer question. Each lesson links to a primary Linux reference.

The lesson picker, previous and next navigation, and browser drafts were checked on the published single-column workbench. Width checks included 1280, 768, 390 and 320 pixels. `npm run check` validates 19 lessons, source focus locations and the offline inventory. The expanded examples were run in the packaged Alpine guest without an external network.

The course uses a real Alpine x86 guest. The TCP short read is an executable program, and the guest's timings depend on the host, browser and emulator. Offline use requires saving the course in that browser profile before disconnecting.

## Wording and interface follow-up

The opening pass covered the overview and all 19 lessons on published commit `1ca24a0`, starting from the stated prerequisite of basic C. It checked the headings, controls, instructions, code examples, console evidence, explanations, transfer questions, references and status messages. Several instructions named an edit without saying which starter output to inspect. The console could carry an earlier lesson or edited source without identifying its origin. The file picker offered one choice and the manual shell competed with the main run action. A browser storage failure was silent. In an actual guest, an immediate 4040 edit reused the port-zero binary because the compiler cache relied on file timestamps.

The closing pass applied the same rubric to all 20 routes:

- Every lesson names the relevant console output before the learner changes anything. Each experiment names its file, exact edit, run action and comparison. New concepts such as descriptors, loopback, end of stream and certificate authorities are explained where they first matter.
- The editor identifies its single source file and opens around the edit. The primary run action starts the guest and handles build setup. The console identifies the source it used, preserves previous completed evidence for comparisons and stays with its lesson. A completed DNS, TCP or TLS experiment can explicitly report a refusal or rejection. Build failures, program exits and interruptions have separate messages.
- The result explanation and transfer question stay visible. The hint, manual reference and guest tools use descriptive disclosures. The shell has a separate console. The previous completed run opens when its source differs from a finished attempt.
- The draft keys still identify the same lessons and filenames. A storage failure leaves the current tab usable and offers a source download. If removal fails, Restore starter changes this tab while identifying the older saved draft that may reopen.
- Build reuse now compares the actual source bytes against the last successful compile. The source record is invalidated before replacing the binary, so an interrupted replacement cannot make an earlier source appear to match a newer executable. A repeated invalid edit still reports the build error.

The functional checks use the packaged guest in Chromium. Primary references remain attached to the lessons. These checks exercise controls, output and saved work. Learning effectiveness remains unmeasured.
