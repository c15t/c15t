import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ENV_VARS, PATHS, URLS } from '../../src/constants';
import {
	createC15TTelemetryOptions,
	HEXBUS_EVENT_NAME_ALIASES,
	TelemetryEventName,
} from '../../src/utils/telemetry';

describe('c15t telemetry configuration', () => {
	let originalTelemetryDisabled: string | undefined;
	let originalTelemetryEndpoint: string | undefined;
	let originalTelemetryWriteKey: string | undefined;
	let originalTelemetryOrgId: string | undefined;

	beforeEach(() => {
		originalTelemetryDisabled = process.env[ENV_VARS.TELEMETRY_DISABLED];
		originalTelemetryEndpoint = process.env[ENV_VARS.TELEMETRY_ENDPOINT];
		originalTelemetryWriteKey = process.env[ENV_VARS.TELEMETRY_WRITE_KEY];
		originalTelemetryOrgId = process.env[ENV_VARS.TELEMETRY_ORG_ID];

		delete process.env[ENV_VARS.TELEMETRY_DISABLED];
		delete process.env[ENV_VARS.TELEMETRY_ENDPOINT];
		delete process.env[ENV_VARS.TELEMETRY_WRITE_KEY];
		delete process.env[ENV_VARS.TELEMETRY_ORG_ID];
	});

	afterEach(() => {
		restoreEnv(ENV_VARS.TELEMETRY_DISABLED, originalTelemetryDisabled);
		restoreEnv(ENV_VARS.TELEMETRY_ENDPOINT, originalTelemetryEndpoint);
		restoreEnv(ENV_VARS.TELEMETRY_WRITE_KEY, originalTelemetryWriteKey);
		restoreEnv(ENV_VARS.TELEMETRY_ORG_ID, originalTelemetryOrgId);
	});

	it('builds Hexbus telemetry options with c15t defaults', () => {
		const options = createC15TTelemetryOptions({
			defaultProperties: { cliVersion: '2.0.0' },
		});

		expect(options).toMatchObject({
			appName: 'c15t',
			defaultProperties: { cliVersion: '2.0.0' },
			disabled: false,
			endpoint: URLS.TELEMETRY,
			envVarPrefix: 'C15T',
			eventNameMap: HEXBUS_EVENT_NAME_ALIASES,
			queueFileName: PATHS.TELEMETRY_QUEUE_FILE,
			source: 'c15t-cli',
			stateFileName: PATHS.TELEMETRY_STATE_FILE,
			storageDir: path.join(os.homedir(), PATHS.CONFIG_DIR),
		});
	});

	it('honors telemetry environment overrides', () => {
		process.env[ENV_VARS.TELEMETRY_DISABLED] = 'true';
		process.env[ENV_VARS.TELEMETRY_ENDPOINT] = 'https://example.test/logs';
		process.env[ENV_VARS.TELEMETRY_WRITE_KEY] = 'write-key';
		process.env[ENV_VARS.TELEMETRY_ORG_ID] = 'org-id';

		const options = createC15TTelemetryOptions();

		expect(options.disabled).toBe(true);
		expect(options.endpoint).toBe('https://example.test/logs');
		expect(options.headers).toMatchObject({
			Authorization: 'Bearer write-key',
			'X-Axiom-Org-Id': 'org-id',
		});
	});

	it('maps Hexbus lifecycle names to c15t event names', () => {
		expect(HEXBUS_EVENT_NAME_ALIASES).toMatchObject({
			cli_completed: TelemetryEventName.CLI_COMPLETED,
			cli_environment_detected: TelemetryEventName.CLI_ENVIRONMENT_DETECTED,
			cli_invoked: TelemetryEventName.CLI_INVOKED,
			command_failed: TelemetryEventName.COMMAND_FAILED,
			command_invoked: TelemetryEventName.COMMAND_EXECUTED,
			command_succeeded: TelemetryEventName.COMMAND_SUCCEEDED,
			command_unknown: TelemetryEventName.COMMAND_UNKNOWN,
			error_occurred: TelemetryEventName.ERROR_OCCURRED,
			help_displayed: TelemetryEventName.HELP_DISPLAYED,
			interactive_menu_exited: TelemetryEventName.INTERACTIVE_MENU_EXITED,
			interactive_menu_opened: TelemetryEventName.INTERACTIVE_MENU_OPENED,
			version_displayed: TelemetryEventName.VERSION_DISPLAYED,
		});
	});
});

function restoreEnv(key: string, value: string | undefined): void {
	if (value === undefined) {
		delete process.env[key];
		return;
	}

	process.env[key] = value;
}
