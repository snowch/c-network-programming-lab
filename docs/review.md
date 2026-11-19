# Course review

The Sites design guidance and the streaming lab’s UX and learning-design guides informed the workbench. The opening dedicates one runnable program to socket creation and another to binding before reading back an assigned port. Each lesson starts with short excerpts taken from the starter source. The run shows actual guest output, with a reading prompt and a focused edit before the transfer question. Each lesson links to a primary Linux reference.

The lesson picker, previous and next navigation, and browser drafts were checked on the published single-column workbench. Width checks included 1280, 768, 390 and 320 pixels. `npm run check` validates 22 lessons, source excerpts and the offline inventory. All 22 lesson programs ran successfully in the packaged Alpine guest with external networking disabled.

The course uses a real Alpine x86 guest. The TCP short read is an executable program, and the guest's timings depend on the host, browser and emulator. Offline use requires saving the course in that browser profile before disconnecting.

## Fresh wording and interface review

The opening pass used the public `eb64611` build after the additional opening lessons, starter excerpts, offline references and icon update. It read every page heading, question, excerpt explanation, task, hint, output prompt, answer, transfer question and reference note from the starting point of basic C. In the opening lessons, Create a UDP socket asked learners to discard their edited draft unnecessarily. Bind the socket to a local port used “listen” for UDP before introducing TCP `listen()`. The course also duplicated some instructions between the lesson and walkthrough data. The workbench could show an earlier lesson’s console, swallow keyboard input after Linux started and report storage success when a draft could not be saved.

The review checked those findings against `2261e49`, which gives each lesson its own program file, introduces a smaller TCP receive experiment and keeps older drafts accessible beside the focused source. The closing pass used the same wording and interface rubric on all 23 routes.

- Starter excerpts stay visible and use the current course’s sizing and order. Each page says how the guest prepares the full program, identifies its runnable evidence and names one exact source edit. **Open editor at the change** exposes the full file and focuses the relevant code.
- The run button stays the primary experiment action. Current and previous output say whether they used starter or edited source. Comparisons with a different source open when an attempt finishes. Protocol outcomes, build errors, program exits and interruptions have distinct feedback. The socket creation edit intentionally exits with status 1 and explains that result beside the experiment.
- Explanations and transfer questions stay visible, with separate hints, offline reference notes and guest tools. The shell uses a separate console. Browser keyboard controls remain available after the serial guest starts.
- Older drafts keep their original source and lesson keys. Learners can select an **Earlier draft** when one is available, run it with its original setup, or use **Open editor at the change** to return to the focused program. Failed writes offer the tab copy as a download, and failed removal leaves **Restore starter** available to retry.
- The existing source-byte build check remains in use. The previous source stamp is removed first when replacing a successful binary so an interruption cannot incorrectly match it with earlier source.

Checks for the focused programs use the source editor and Linux guest in Chromium. Responsive checks use 320, 390, 768 and 1440 pixels in light and dark configurations and exercise the skip link, edit button, theme control, Linux shell disclosure and offline reference notes. All 32 distinct external manual and protocol URLs responded successfully in the opening review. Learning effectiveness remains unmeasured.
