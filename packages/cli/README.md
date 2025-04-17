# c15t CLI

The Command Line Interface for managing c15t consent management projects.

## Installation

```bash
npm install @c15t/cli
```

Or using yarn:

```bash
yarn add @c15t/cli
```

## Usage

The CLI can be invoked directly if installed globally:

```bash
c15t [command] [options]
```

Or with npx:

```bash
npx @c15t/cli [command] [options]
```

## Commands

- `generate` - Generate schema/code based on your c15t config
- `migrate` - Run database migrations based on your c15t config
- `github` - Open the c15t GitHub repository
- `docs` - Open the c15t documentation in your browser

## Options

- `--help, -h` - Show the help menu
- `--version, -v` - Show the CLI version
- `--logger` - Set log level (fatal, error, warn, info, debug)
- `--config` - Specify path to configuration file
- `-y` - Skip confirmation prompts (use with caution)
- `--no-telemetry` - Disable telemetry data collection

## Telemetry

The c15t CLI collects anonymous telemetry data to help us understand how the CLI is being used and improve the tool. This data is completely anonymous and does not contain any personal information.

### What we collect

We collect structured events with descriptive names following a `category.action` pattern such as:

- **CLI lifecycle events**: `cli.invoked`, `cli.completed`, `cli.exited`
- **Command events**: `command.executed`, `command.succeeded`, `command.failed`, `command.unknown`
- **UI events**: `ui.menu.opened`, `ui.menu.exited`
- **Configuration events**: `config.loaded`, `config.error`
- **Help and version events**: `help.displayed`, `version.displayed`
- **Onboarding events**: `onboarding.started`, `onboarding.completed`
- **Error events**: `error.occurred`

Each event includes relevant contextual information, but never includes sensitive data such as:
- Personal information
- Configuration file contents
- File paths
- Project-specific data

### Disabling Telemetry

You can disable telemetry in any of the following ways:

1. Use the `--no-telemetry` flag when running a command:
   ```bash
   c15t generate --no-telemetry
   ```

2. Set the environment variable `C15T_TELEMETRY_DISABLED`:
   ```bash
   # In your shell
   export C15T_TELEMETRY_DISABLED=1
   
   # Or for a single command
   C15T_TELEMETRY_DISABLED=1 c15t generate
   ```

## Documentation

For more detailed documentation, visit [https://c15t.com](https://c15t.com).

## License

MIT