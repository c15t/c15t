#!/usr/bin/env node
import { commands } from './commands/registry';
import { parseCliArgs } from './context/parser';
import { runCli } from './index';
import { createCliLogger, validLogLevels } from './utils/logger';
import type { LogLevel } from './utils/logger';

const args = process.argv.slice(2);
const separator = args.indexOf('--');
const flagArgs = separator < 0 ? args : args.slice(0, separator);
const json = flagArgs.reduce((enabled, arg) => {
	if (arg === '--json' || arg === '--json=true') {
		return true;
	}
	return arg === '--json=false' ? false : enabled;
}, false);
let level: LogLevel = 'info';
try {
	const { parsedFlags } = parseCliArgs(args, commands);
	if (
		typeof parsedFlags.logger === 'string' &&
		validLogLevels.includes(parsedFlags.logger as LogLevel)
	) {
		level = parsedFlags.logger as LogLevel;
	}
} catch {
	// runCli returns the validation error in the selected output format.
}
const interactive =
	Boolean(process.stdin.isTTY && process.stdout.isTTY) && !json;
const logger = createCliLogger(level, {
	interactive,
	write: json
		? (line) => {
				process.stderr.write(`${line}\n`);
			}
		: undefined,
});
const result = await runCli(args, { interactive, logger, telemetry: true });
if (json) {
	process.stdout.write(`${JSON.stringify(result)}\n`);
}
process.exitCode = result.exitCode;
