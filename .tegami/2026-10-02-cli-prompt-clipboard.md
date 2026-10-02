---
packages:
  '@c15t/cli': patch
---

### Copy setup prompt previews to the clipboard

Copy the Codex setup prompt to the clipboard when previewing with `--plan` or
`--dry-run`, and confirm the copy in the terminal. Keep printing the prompt when
clipboard access fails so it can be copied manually. JSON previews continue to
export the prompt without accessing the clipboard.

Omit the public setup inputs section when no configuration is supplied, while
keeping the complete frontend setup task and guidance to ask for missing inputs.
