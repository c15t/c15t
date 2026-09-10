---
title: CLI global flags
description: Control help, configuration, logging and telemetry for the installed c15t CLI.
group: cli
---

## Supported flags

| Flag                | Effect                                        |
| ------------------- | --------------------------------------------- |
| `--help`, `-h`      | Show help                                     |
| `--version`, `-v`   | Show the CLI version                          |
| `--config PATH`     | Read the specified configuration file         |
| `--logger LEVEL`    | Set fatal, error, warn, info or debug logging |
| `--yes`, `-y`       | Skip confirmation prompts                     |
| `--no-telemetry`    | Disable telemetry collection                  |
| `--telemetry-debug` | Show detailed telemetry logs                  |

```bash
bun run cli --no-telemetry --help
```

`C15T_TELEMETRY_DISABLED=1` also disables telemetry. Check the installed release's
help before depending on flags in automation. Supply a value after `--config`
and `--logger`; an omitted value is not the same as selecting a default path or
log level.
