/**
 * The process the idle measurement watches.
 *
 * It attaches a consent client the way an app does, holds one live subscription,
 * settles, and then does nothing for the measured window. Nothing polls and
 * nothing is scheduled: the question is whether an idle consent subscription
 * costs CPU or memory anyway.
 *
 * The settle phase matters. Module load leaves pages untouched and the JIT cold,
 * so a baseline taken at import time would charge the idle window for startup.
 *
 * Spawned as its own process by `measure/idle.ts`.
 */

import { createConsentClient } from '@c15t/react-native';

import { ensureReactGlobalForDist } from './ensure-react-global';
import { installBenchNativeModule } from './fake-native';
import { buildSnapshot } from './fixtures';
import {
	NativeEventEmitter,
	nativeListenerCount,
	resetNativeStub,
	setNativeModule,
} from './react-native-stub';

/** Name the native cores register the TurboModule under. */
const MODULE_NAME = 'C15t';

const parseWindow = function parseWindow(
	raw: string | undefined,
	name: string
): number {
	const value = Number(raw);
	if (!Number.isFinite(value) || value <= 0) {
		throw new Error(
			`idle ${name} must be a positive number of milliseconds, got ${String(raw)}`
		);
	}
	return value;
};

const windowMs = parseWindow(process.argv[2], 'window');
const settleMs = parseWindow(process.argv[3] ?? '2000', 'settle');

ensureReactGlobalForDist();
resetNativeStub();

const native = installBenchNativeModule(
	MODULE_NAME,
	setNativeModule,
	buildSnapshot()
);

// The same emitter surface `getNativeC15tEvents()` builds in a real app, so the
// listener this process holds is the kind the contract is about.
const client = createConsentClient(
	native as never,
	{
		addListener: (eventName: string, listener: (payload: unknown) => void) =>
			new NativeEventEmitter(native).addListener(eventName, listener),
	} as never
);

// The active subscription.
const stopWatching = client.subscribe(
	(snapshot: { revision: number }) => snapshot.revision,
	() => undefined
);
client.getSnapshot();

await new Promise<void>((resolve) => {
	setTimeout(resolve, settleMs);
});

const listenersDuring = nativeListenerCount('snapshot');
const cpuBefore = process.cpuUsage();
const memoryBefore = process.memoryUsage();
const startedAt = process.hrtime.bigint();

await new Promise<void>((resolve) => {
	setTimeout(resolve, windowMs);
});

const elapsedNs = Number(process.hrtime.bigint() - startedAt);
const cpuAfter = process.cpuUsage(cpuBefore);
const memoryAfter = process.memoryUsage();

stopWatching();
client.dispose();

process.stdout.write(
	JSON.stringify({
		elapsedMs: Number((elapsedNs / 1e6).toFixed(1)),
		listeners: listenersDuring,
		memory: {
			heapGrowthBytes: memoryAfter.heapUsed - memoryBefore.heapUsed,
			rssBytes: memoryAfter.rss,
			rssGrowthBytes: memoryAfter.rss - memoryBefore.rss,
		},
		settleMs,
		windowMs,
		work: {
			cpuSystemMs: Number((cpuAfter.system / 1000).toFixed(3)),
			cpuUserMs: Number((cpuAfter.user / 1000).toFixed(3)),
		},
	})
);
