import { createConsentKernel } from '../../../packages/core/src/index';
import type { Script } from '../../../packages/core/src/index';
import { createScriptLoader } from '../../../packages/core/src/modules/script-loader/index';
import { cloudflareZaraz } from '../../../packages/scripts/src/vendors/tag-managers/cloudflare-zaraz';

const denied = {
	experience: false,
	functionality: false,
	marketing: false,
	measurement: false,
	necessary: true,
};

type Scenario = 'empty' | 'callbacks' | 'zaraz';

declare global {
	interface Window {
		runZarazBenchmark: (
			scenario: Scenario,
			iterations: number
		) => Promise<number>;
		verifyZarazBridge: () => Promise<string[]>;
	}
}

const installFixture = (initial: Record<string, boolean>) => {
	let permissions = { ...initial };
	const history: string[] = [];
	const api = {
		APIReady: true,
		getAll: () => ({ ...permissions }),
		modal: false,
		sendQueuedEvents: () => {
			history.push('flush');
		},
		set: (next: Record<string, boolean>) => {
			permissions = { ...next };
			history.push('set');
		},
	};
	Object.defineProperty(window, 'zaraz', {
		configurable: true,
		value: { consent: api },
	});
	return { api, history };
};

window.runZarazBenchmark = async (scenario, iterations) => {
	const kernel = createConsentKernel();
	await kernel.commands.save(denied);
	const { api } = installFixture({ ads: false, analytics: false });
	let scripts: Script[] = [];
	if (scenario === 'callbacks') {
		scripts = Array.from({ length: 50 }, (_, i) => ({
			alwaysLoad: true,
			callbackOnly: true,
			category: 'necessary',
			id: `callback-${i}`,
			onConsentChange: ({ consents }) => {
				api.set({ analytics: consents.measurement });
			},
		}));
	} else if (scenario === 'zaraz') {
		scripts = [
			cloudflareZaraz({
				purposes: { marketing: ['ads'], measurement: ['analytics'] },
			}),
		];
	}
	const start = performance.now();
	const loader = createScriptLoader({
		emitToV2DebugListeners: false,
		kernel,
		scripts,
	});
	for (let i = 0; i < iterations; i += 1) {
		// oxlint-disable-next-line no-await-in-loop -- Each consent transition must finish before the next begins.
		await kernel.commands.save({
			...denied,
			marketing: i % 4 === 0,
			measurement: i % 2 === 0,
		});
	}
	loader.dispose();
	const elapsed = performance.now() - start;
	kernel.dispose();
	return elapsed / iterations;
};

window.verifyZarazBridge = async () => {
	const passed: string[] = [];
	const assert = (condition: boolean, message: string) => {
		if (!condition) {
			throw new Error(message);
		}
		passed.push(message);
	};
	const kernel = createConsentKernel();
	await kernel.commands.save(denied);
	const { api, history } = installFixture({
		ads: true,
		analytics: true,
		unmapped: true,
	});
	const script = cloudflareZaraz({
		onReady: () => {
			history.push('ready');
		},
		purposes: { marketing: ['ads'], measurement: ['analytics'] },
	});
	const before = document.scripts.length;
	const loader = createScriptLoader({ kernel, scripts: [script] });
	try {
		assert(
			Object.values(api.getAll()).every((allowed) => !allowed),
			'Stale and unmapped grants denied before readiness callback'
		);
		assert(
			history.join(',') === 'set,ready',
			'Permissions applied before the first application event'
		);
		// oxlint-disable-next-line no-await-in-loop -- Each consent transition must finish before the next begins.
		await kernel.commands.save({ ...denied, measurement: true });
		assert(
			api.getAll().analytics === true && api.getAll().ads === false,
			'Measurement grant leaves marketing denied'
		);
		assert(
			history.slice(-2).join(',') === 'set,flush',
			'Queued pageviews flushed only after grant'
		);
		// oxlint-disable-next-line no-await-in-loop -- Each consent transition must finish before the next begins.
		await kernel.commands.save(denied);
		assert(
			api.getAll().analytics === false && history.at(-1) === 'set',
			'Revocation does not flush events'
		);
		assert(
			document.scripts.length === before,
			'Bridge inserts no vendor script'
		);
		loader.dispose();
		const count = history.length;
		// oxlint-disable-next-line no-await-in-loop -- Each consent transition must finish before the next begins.
		await kernel.commands.save({ ...denied, measurement: true });
		document.dispatchEvent(new Event('zarazConsentAPIReady'));
		assert(history.length === count, 'Disposed bridge ignores further updates');
	} finally {
		loader.dispose();
		kernel.dispose();
	}
	return passed;
};
