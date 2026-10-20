import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import {
	ConsentManagerProvider,
	clearConsentManagerCache,
} from '../consent-manager-provider';

// Other files in this browser run mock `c15t`. Registering a pass-through
// mock keeps Vitest from failing this file's import of the real module.
vi.mock('c15t', async (importOriginal) => await importOriginal());

const WARNED = Symbol.for('c15t.noRecordsWarned');

// Core caches clients by storage key, so each render gets its own key.
let storageKey = 0;
const nextStorageConfig = () => ({
	storageKey: `react-no-records-${storageKey++}`,
});

const isNoRecordsWarning = (args: unknown[]) =>
	typeof args[0] === 'string' &&
	args[0].startsWith('[c15t] Offline mode keeps consent only in this browser.');

describe('ConsentManagerProvider offline no-records warning', () => {
	let warn: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		clearConsentManagerCache();
		delete (globalThis as { [WARNED]?: true })[WARNED];
		warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	});

	afterEach(() => {
		warn.mockRestore();
	});

	it('warns once in development', async () => {
		const screen = await render(
			<ConsentManagerProvider
				options={{ mode: 'offline', storageConfig: nextStorageConfig() }}
			>
				<div>app</div>
			</ConsentManagerProvider>
		);
		await screen.rerender(
			<ConsentManagerProvider
				options={{ mode: 'offline', storageConfig: nextStorageConfig() }}
			>
				<div>app</div>
			</ConsentManagerProvider>
		);

		expect(warn.mock.calls.filter(isNoRecordsWarning)).toHaveLength(1);
	});

	it('passes acknowledgeNoRecords through to core', async () => {
		await render(
			<ConsentManagerProvider
				options={{
					acknowledgeNoRecords: true,
					mode: 'offline',
					storageConfig: nextStorageConfig(),
				}}
			>
				<div>app</div>
			</ConsentManagerProvider>
		);

		expect(warn.mock.calls.filter(isNoRecordsWarning)).toHaveLength(0);
	});

	// React caches managers by a key that leaves the flag out, so the second
	// provider gets the first one's manager.
	it('warns a later unacknowledged provider that reuses a cached manager', async () => {
		const storageConfig = nextStorageConfig();
		const first = await render(
			<ConsentManagerProvider
				options={{ acknowledgeNoRecords: true, mode: 'offline', storageConfig }}
			>
				<div>app</div>
			</ConsentManagerProvider>
		);
		await first.unmount();

		await render(
			<ConsentManagerProvider options={{ mode: 'offline', storageConfig }}>
				<div>app</div>
			</ConsentManagerProvider>
		);

		expect(warn.mock.calls.filter(isNoRecordsWarning)).toHaveLength(1);
	});
});
