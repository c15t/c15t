/**
 * The fixtures have to be the payload a device actually sends.
 *
 * The bridge carries a JSON string, so a key the fixtures spell wrongly is invisible
 * to TypeScript: the boundary reads `undefined`, falls back to denying everything,
 * and every JavaScript number in this suite silently describes the wrong snapshot.
 * The package notices and warns, so the assertion is that a client reading these
 * fixtures stays quiet.
 */

import { createConsentClient } from '@c15t/react-native';
import { describe, expect, it } from 'vitest';

import { STORED_SNAPSHOT } from '../measure/cached-consent';
import { ensureReactGlobalForDist } from '../support/ensure-react-global';
import { installBenchNativeModule } from '../support/fake-native';
import { buildSnapshot } from '../support/fixtures';
import {
	NativeEventEmitter,
	resetNativeStub,
	setNativeModule,
} from '../support/react-native-stub';

ensureReactGlobalForDist();

/** A client over a module serving `snapshot`, with the real event emitter attached. */
const clientFor = function clientFor(
	snapshot: ReturnType<typeof buildSnapshot>
) {
	const native = installBenchNativeModule('C15t', setNativeModule, snapshot);

	return createConsentClient(
		native as never,
		{
			addListener: (eventName: string, listener: (payload: unknown) => void) =>
				new NativeEventEmitter(native).addListener(eventName, listener),
		} as never
	);
};

/** A client over a snapshot the store would hand back. */
const clientForStored = function clientForStored() {
	const native = installBenchNativeModule(
		'C15t',
		setNativeModule,
		STORED_SNAPSHOT
	);

	return createConsentClient(
		native as never,
		{ addListener: () => ({ remove: () => undefined }) } as never
	);
};

/**
 * Run `run` against a fresh client with `console.warn` captured.
 *
 * @param run - Work whose warnings matter.
 * @returns Every warning line, joined per call.
 */
const captureWarnings = async function captureWarnings(
	run: (client: ReturnType<typeof clientFor>) => Promise<void> | void
): Promise<string[]> {
	resetNativeStub();
	const client = clientFor(buildSnapshot());
	const original = console.warn;
	const lines: string[] = [];

	console.warn = (...args: unknown[]) => {
		lines.push(args.map((arg) => String(arg)).join(' '));
	};

	try {
		await run(client);
	} finally {
		console.warn = original;
		client.dispose();
	}

	return lines;
};

describe('the fixtures against the declared wire shape', () => {
	it('reads the default snapshot without one key name being wrong', async () => {
		const lines = await captureWarnings((client) => {
			client.getSnapshot();
		});

		expect(lines.join('\n')).not.toMatch(/key names this package declares/u);
	});

	it('reads the snapshot a commit writes back', async () => {
		const lines = await captureWarnings(async (client) => {
			await client.commit({ action: 'all' });
			const snapshot = client.getSnapshot();
			// The receipts are the part that drifted once already, so the run that
			// stayed quiet has to be a run that actually carried them.
			expect(snapshot.explicitChoice?.version).toBe(3);
			expect(snapshot.explicitChoice?.categories.marketing?.value).toBe(true);
		});

		expect(lines.join('\n')).not.toMatch(/key names this package declares/u);
	});

	it('reads the stored snapshot the cache rows are built from', () => {
		resetNativeStub();
		const client = clientForStored();
		const original = console.warn;
		const lines: string[] = [];

		console.warn = (...args: unknown[]) => {
			lines.push(args.map((arg) => String(arg)).join(' '));
		};

		try {
			expect(client.isAllowed('marketing')).toBe(true);
		} finally {
			console.warn = original;
			client.dispose();
		}

		expect(lines.join('\n')).not.toMatch(/key names this package declares/u);
	});

	it('spells location, overrides, and privacy signals the way the kernel does', () => {
		const snapshot = buildSnapshot();

		expect(snapshot.location).toEqual({ countryCode: 'DE', regionCode: 'BE' });
		expect(snapshot.overrides).toEqual({
			country: 'DE',
			gpc: null,
			language: 'en',
			region: 'BE',
		});
		expect(snapshot.privacySignals.gpc).toEqual({
			active: false,
			detected: false,
			override: null,
		});
	});
});
