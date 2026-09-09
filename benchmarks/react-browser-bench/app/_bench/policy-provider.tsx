'use client';

import type { PolicyBenchFixtureName } from '@c15t/benchmarking/policy-fixtures';
import { createConsentKernel, createHostedTransport } from '@c15t/core';
import type { InitResponse } from '@c15t/core';
import { createPersistence } from '@c15t/core/modules/persistence';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentProvider,
	hosted,
} from '@c15t/react';
import type { ConsentProviderOptions } from '@c15t/react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { PolicyBenchmarkProbe } from './policy-probe';
import {
	getPolicyBenchState,
	readPromptRequirement,
	readStoredChoice,
} from './policy-state';
import type {
	PolicyBenchScenario,
	PolicyHydrationMeasurement,
} from './policy-state';

const consentCategories = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] satisfies NonNullable<ConsentProviderOptions['consentCategories']>;

/**
 * Count storage writes while a callback runs. Wraps `localStorage.setItem`
 * and the `document.cookie` setter so a hydration that writes back is
 * measured, not assumed.
 */
const countStorageWrites = function countStorageWrites(
	run: () => void
): number {
	let writes = 0;
	const storageProto = Object.getPrototypeOf(window.localStorage) as {
		setItem: typeof Storage.prototype.setItem;
	};
	const originalSetItem = storageProto.setItem;
	const cookieDescriptor =
		Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ??
		Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
	storageProto.setItem = function setItem(
		this: Storage,
		...args: Parameters<typeof Storage.prototype.setItem>
	) {
		writes += 1;
		return originalSetItem.apply(this, args);
	};
	if (cookieDescriptor?.set && cookieDescriptor.get) {
		Object.defineProperty(document, 'cookie', {
			configurable: true,
			get: cookieDescriptor.get,
			set(value: string) {
				writes += 1;
				cookieDescriptor.set?.call(document, value);
			},
		});
	}
	try {
		run();
	} finally {
		storageProto.setItem = originalSetItem;
		if (cookieDescriptor?.set) {
			// Drop the own accessor so the prototype's `cookie` is visible again.
			Reflect.deleteProperty(document, 'cookie');
		}
	}
	return writes;
};

const HYDRATION_ROUNDS = 5;

const measureHydration = async function measureHydration(
	backendURL: string,
	iterations: number
): Promise<PolicyHydrationMeasurement> {
	// Resolve the fixture's init once; each kernel then carries that policy
	// and pays only the synchronous storage read during hydrate().
	const transport = createHostedTransport({ backendURL });
	const response = (await transport.init?.({
		overrides: {},
		user: null,
	})) as InitResponse;
	const staticTransport = {
		...transport,
		init: () => Promise.resolve(response),
	};

	// Chromium clamps performance.now() to 100µs on non-isolated pages, so
	// a single hydrate() reads as 0 or 100. Each round prepares `iterations`
	// kernels untimed, then times their hydrate() calls as one block and
	// reports the per-call mean; rounds are the samples.
	const samples: number[] = [];
	let hydratedFromStorage = true;
	let hydrateCallCount = 0;
	let hydrateSuccessCount = 0;
	let writeCount = 0;
	let activeUI = 'none';
	let promptKind: string | null = null;
	let hasStoredChoice: boolean | null = null;

	for (let round = 0; round < HYDRATION_ROUNDS; round += 1) {
		const prepared: {
			kernel: ReturnType<typeof createConsentKernel>;
			handle: ReturnType<typeof createPersistence>;
		}[] = [];
		for (let index = 0; index < iterations; index += 1) {
			const kernel = createConsentKernel({ transport: staticTransport });
			// oxlint-disable-next-line no-await-in-loop -- sequential by design
			await kernel.commands.init();
			prepared.push({
				handle: createPersistence({ kernel, skipHydration: true }),
				kernel,
			});
		}
		let hydratedCount = 0;
		let calls = 0;
		const startedAt = performance.now();
		const writes = countStorageWrites(() => {
			for (const entry of prepared) {
				calls += 1;
				if (entry.handle.hydrate()) {
					hydratedCount += 1;
				}
			}
		});
		samples.push(((performance.now() - startedAt) * 1000) / prepared.length);
		writeCount += writes;
		hydrateCallCount += calls;
		hydrateSuccessCount += hydratedCount;
		hydratedFromStorage &&= hydratedCount === prepared.length;
		if (round === 0) {
			const snapshot = prepared[0]?.kernel.getSnapshot();
			activeUI = snapshot?.activeUI ?? 'none';
			promptKind = readPromptRequirement(snapshot).kind;
			hasStoredChoice = readStoredChoice(snapshot);
		}
		for (const entry of prepared) {
			entry.handle.dispose();
			entry.kernel.dispose();
		}
	}

	return {
		activeUI,
		hasStoredChoice,
		hydrateCallCount,
		hydrateSuccessCount,
		hydrateUs: samples,
		hydratedFromStorage,
		promptKind,
		writeCount,
	};
};

export const PolicyBenchmarkProvider = ({
	children,
	fixture,
	scenario,
}: {
	children: ReactNode;
	fixture: PolicyBenchFixtureName;
	scenario: PolicyBenchScenario;
}) => {
	const backendURL = `/api/bench-policy/${fixture}`;

	useEffect(() => {
		const state = getPolicyBenchState(scenario, fixture);
		if (state) {
			state.measureHydration = (iterations) =>
				measureHydration(backendURL, iterations);
		}
	}, [backendURL, fixture, scenario]);

	const options: ConsentProviderOptions = {
		callbacks: {
			onChoiceRecorded() {
				const state = getPolicyBenchState(scenario, fixture);
				if (state) {
					state.onChoiceRecordedCount += 1;
				}
			},
			onError() {
				const state = getPolicyBenchState(scenario, fixture);
				if (state) {
					state.onErrorCount += 1;
				}
			},
		},
		consentCategories,
		mode: hosted({ url: backendURL }),
		theme: {
			motion: {
				duration: {
					fast: '1ms',
					normal: '1ms',
					slow: '1ms',
				},
			},
		},
	};

	return (
		<ConsentProvider options={options}>
			<PolicyBenchmarkProbe
				fixture={fixture}
				scenario={scenario}
			/>
			<ConsentBanner disableAnimation />
			<ConsentDialog disableAnimation />
			{children}
		</ConsentProvider>
	);
};
