---
packages:
  '@c15t/cli': patch
---

### Improve native frontend setup errors and recovery

Report missing or malformed hosted backend URLs with guidance to supply
`--backend-url` or select a project. Accept `--mode` in forwarded generation
arguments and reject repeated modes.

Clean up unpublished recovery stages when the initial journal write fails.
Recover a missing or partial journal only when no staged files or unexpected
contents remain, preserving application files.

Report unsupported Windows agent and native installer launches with manual
alternatives. Reject native workflows that request installation on Windows
before writing files. Clarify that project selection belongs to the current
application.
