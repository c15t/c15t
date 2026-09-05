import { describe, expect, setSystemTime, test } from 'bun:test';

import { createConsentKernel, safeFallbackPolicyRule } from '@c15t/core';
import type { ConsentKernel, PolicyResolution } from '@c15t/core';
import { readStoredRecordsFromCookieHeader } from '@c15t/core/modules/persistence';
/** These meta-tests corrupt actual kernel observations, not a policy evaluator. */
import { GVL, TCModel, TCString } from '@iabtechlabtcf/core';

import type {
	PolicyEvidence,
	PolicyLogs,
	PolicySession,
	PolicyStorageBytes,
} from '../contract/policy-driver';
import type {
	PolicyObservation,
	PolicyScenario,
} from '../contract/policy-scenarios';
import { DriverNotImplementedError } from '../driver';
import type { TestDriver } from '../driver';
import { MINIMAL_GVL } from '../fixtures/gvl';
import { POLICY_RECORDS, POLICY_NOW } from '../fixtures/policy-records';
import { POLICY_CHOICE, POLICY_SCENARIOS } from '../fixtures/policy-scenarios';
import { conformanceTest } from './helpers';
import type { SuiteApi } from './helpers';
import { runConformanceSuite } from './index';
import { executePolicyScenario, policySessionSetup } from './policy-scenarios';

const api: SuiteApi = { describe, expect, test };
const emptyLogs = (): PolicyLogs => ({
	callbacks: [],
	diagnostics: [],
	events: [],
	requests: [],
});
const emptyStorage = (): PolicyStorageBytes => ({
	choice: { cookie: null, localStorage: null },
	legacyLocalStorage: null,
	notice: { cookie: null, localStorage: null },
	privacy: { cookie: null, localStorage: null },
});

const unsupported = function unsupported(
	framework: TestDriver['framework'] = 'react'
): TestDriver {
	return {
		framework,
		getStore: () => {
			throw new DriverNotImplementedError(framework, 'getStore');
		},
		mount: () => {
			throw new DriverNotImplementedError(framework, 'mount');
		},
		serverRender: () => {
			throw new DriverNotImplementedError(framework, 'serverRender');
		},
	};
};

const resolution = function resolution(
	notice = false,
	gpc = false
): PolicyResolution {
	const policy = safeFallbackPolicyRule();
	policy.scope = ['marketing', 'measurement'];
	policy.validity = { choiceMs: 86400000, noticeMs: 86400000 };
	if (notice) {
		policy.model = 'opt-out';
		policy.prompt = 'notice';
		policy.actions = {
			allowed: ['dismiss'],
			equivalent: [],
			required: ['dismiss'],
		};
	}
	if (gpc) {
		policy.privacySignals.gpc.denyCategories = ['marketing', 'measurement'];
	}
	return {
		fingerprints: {
			choice: POLICY_CHOICE.choice.fingerprint,
			legacyMaterial: POLICY_CHOICE.legacyMaterialFingerprint,
			notice: POLICY_CHOICE.notice.fingerprint,
			policy: 'policy-v1:current',
		},
		matchedBy: 'default',
		policy,
		policyId: policy.id,
		status: 'matched',
	};
};

const evidence = function evidence(
	kernel: ConsentKernel,
	logs = emptyLogs()
): PolicyEvidence {
	const snapshot = kernel.getSnapshot();
	return structuredClone({
		// No UI is mounted in checker unit tests; none assert this placeholder.
		dom: {
			actions: [],
			firstLayer: 'hidden',
			preferencesOpen: false,
			rights: [],
		},
		logs,
		snapshot: {
			effectivePermissions: snapshot.effectivePermissions,
			evaluatedAt: snapshot.evaluatedAt,
			explicitChoice: snapshot.explicitChoice,
			iab: snapshot.iab,
			noticeDismissal: snapshot.noticeDismissal,
			optOutDirectives: snapshot.optOutDirectives,
			policyRule: snapshot.policyRule,
			policySnapshotToken: snapshot.policySnapshotToken,
			privacySignals: snapshot.privacySignals,
			promptRequirement: snapshot.promptRequirement,
			resolution: snapshot.resolution,
			subject: snapshot.subject,
		},
		storage: emptyStorage(),
	});
};

const checkObservation = async function checkObservation(
	actual: PolicyEvidence,
	expected: PolicyObservation,
	baseline: PolicySession['baseline'] = {
		logs: emptyLogs(),
		storage: emptyStorage(),
	}
): Promise<void> {
	let disposed = 0;
	const driver: TestDriver = {
		...unsupported(),
		createPolicySession: () =>
			Promise.resolve({
				baseline,
				dispose: () => {
					disposed += 1;
				},
				execute: async () => {},
				observe: () => actual,
			}),
	};
	const scenario: PolicyScenario = {
		covers: ['A'],
		id: 'corrupted-observation',
		now: POLICY_NOW,
		policy: POLICY_CHOICE,
		steps: [{ expect: expected, operation: { kind: 'hydrate' } }],
	};
	try {
		await executePolicyScenario(driver, api, scenario);
	} finally {
		expect(disposed).toBe(1);
	}
};

const withKernel = async function withKernel(
	run: (kernel: ConsentKernel) => Promise<void>,
	options = { gpc: false, notice: false }
): Promise<void> {
	setSystemTime(POLICY_NOW);
	const kernel = createConsentKernel({
		initialPolicyResolution: resolution(options.notice, options.gpc),
		initialPrivacySignals: { gpc: options.gpc },
		now: POLICY_NOW,
	});
	try {
		await run(kernel);
	} finally {
		kernel.dispose();
		setSystemTime();
	}
};

const hydrateGrant = function hydrateGrant(kernel: ConsentKernel): void {
	const { raw } = POLICY_RECORDS['legacy-no-hash'];
	kernel.hydrate(
		readStoredRecordsFromCookieHeader(
			`c15t=${encodeURIComponent(raw)}`,
			undefined,
			POLICY_NOW
		)
	);
};

describe('shared policy assertion sensitivity', () => {
	test('rejects a grant after GPC from an otherwise real snapshot', async () => {
		await withKernel(
			async (kernel) => {
				hydrateGrant(kernel);
				await kernel.commands.init();
				const actual = evidence(kernel);
				await checkObservation(actual, { permissions: { marketing: false } });
				actual.snapshot.effectivePermissions.marketing = true;
				await expect(
					checkObservation(actual, { permissions: { marketing: false } })
				).rejects.toThrow('corrupted-observation');
			},
			{ gpc: true, notice: true }
		);
	});

	test('rejects a choice event added to read-only hydration', async () => {
		await withKernel(async (kernel) => {
			const events: { name: string; payload: unknown }[] = [];
			kernel.events.on('choice:recorded', (payload) =>
				events.push({ name: 'choice:recorded', payload })
			);
			hydrateGrant(kernel);
			const actual = evidence(kernel, { ...emptyLogs(), events });
			await checkObservation(actual, { events: { 'choice-recorded': 0 } });
			actual.logs.events = [
				...actual.logs.events,
				{ name: 'choice:recorded', payload: { snapshot: actual.snapshot } },
			];
			await expect(
				checkObservation(actual, { events: { 'choice-recorded': 0 } })
			).rejects.toThrow('corrupted-observation');
		});
	});

	test('rejects fabricated receipt timestamps', async () => {
		await withKernel(async (kernel) => {
			hydrateGrant(kernel);
			const actual = evidence(kernel);
			const expected = {
				choice: POLICY_RECORDS['legacy-no-hash'].expected.choice,
			};
			await checkObservation(actual, expected);
			const receipt = actual.snapshot.explicitChoice?.categories.marketing;
			if (!receipt) {
				throw new Error('Real hydration did not produce a receipt');
			}
			receipt.confirmedAt = POLICY_NOW;
			await expect(checkObservation(actual, expected)).rejects.toThrow(
				'corrupted-observation'
			);
		});
	});

	test('rejects a notice save that hides the required prompt', async () => {
		await withKernel(
			async (kernel) => {
				await kernel.commands.init();
				await kernel.commands.save({ marketing: false });
				const actual = evidence(kernel);
				const expected: PolicyObservation = {
					prompt: { kind: 'notice', reason: 'missing' },
				};
				await checkObservation(actual, expected);
				actual.snapshot.promptRequirement = { kind: 'none' };
				await expect(checkObservation(actual, expected)).rejects.toThrow(
					'corrupted-observation'
				);
			},
			{ gpc: false, notice: true }
		);
	});

	test('rejects missing SSR rather than passing a supported adapter', async () => {
		await withKernel(async (kernel) => {
			await expect(
				checkObservation(evidence(kernel), {
					ssr: { domParity: true, hydrationWarnings: 0, promptParity: true },
				})
			).rejects.toThrow('corrupted-observation');
		});
	});

	test('rejects ignored public callback configuration', async () => {
		await withKernel(async (kernel) => {
			await kernel.commands.save('all');
			await expect(
				checkObservation(evidence(kernel), { consentCallbacks: 1 })
			).rejects.toThrow('corrupted-observation');
		});
	});
});

describe('evidence deltas and hydration diagnostics', () => {
	test('counts the current action independently of earlier cumulative callbacks', async () => {
		await withKernel(async (kernel) => {
			const events: { name: string; payload: unknown }[] = [];
			const callbacks: { name: string; payload: unknown }[] = [];
			kernel.events.on('choice:recorded', (payload) => {
				events.push({ name: 'choice:recorded', payload });
				callbacks.push({ name: 'onChoiceRecorded', payload });
			});
			kernel.events.on('permissions:changed', (payload) => {
				events.push({ name: 'permissions:changed', payload });
				callbacks.push({ name: 'onPermissionsChanged', payload });
			});
			await kernel.commands.save('all');
			const first = evidence(kernel, { ...emptyLogs(), callbacks, events });
			await kernel.commands.save('all');
			const second = evidence(kernel, { ...emptyLogs(), callbacks, events });
			await checkObservation(
				second,
				{
					consentCallbacks: 1,
					events: { 'choice-recorded': 1, 'permissions-changed': 0 },
				},
				{ logs: first.logs, storage: first.storage }
			);
			const invocation = second.logs.callbacks.at(-1);
			if (!invocation) {
				throw new Error('No observed second action');
			}
			invocation.payload = { actionAt: POLICY_NOW + 1 };
			await expect(
				checkObservation(
					second,
					{ consentCallbacks: 1 },
					{ logs: first.logs, storage: first.storage }
				)
			).rejects.toThrow('corrupted-observation');
		});
	});

	for (const defect of ['warning', 'flash', 'clock', 'empty-dom'] as const) {
		test(`rejects SSR ${defect}`, async () => {
			await withKernel(async (kernel) => {
				const actual = evidence(kernel);
				const render = {
					dom: '<div>Consent</div>',
					firstLayer: 'choice' as const,
					now: POLICY_NOW,
					prompt: actual.snapshot.promptRequirement,
				};
				actual.ssr = {
					client: { ...render },
					firstLayerHistory: ['choice', 'choice'],
					hydrationWarnings: [],
					server: { ...render },
				};
				const expected: PolicyObservation = {
					ssr: { domParity: true, hydrationWarnings: 0, promptParity: true },
				};
				await checkObservation(actual, expected);
				if (defect === 'warning') {
					actual.ssr.hydrationWarnings = ['Hydration failed'];
				}
				if (defect === 'flash') {
					actual.ssr.firstLayerHistory = ['choice', 'hidden', 'choice'];
				}
				if (defect === 'clock') {
					actual.ssr.client.now += 1;
				}
				if (defect === 'empty-dom') {
					actual.ssr.client.dom = '';
					actual.ssr.server.dom = '';
				}
				await expect(checkObservation(actual, expected)).rejects.toThrow(
					'corrupted-observation'
				);
			});
		});
	}

	test('rejects a hydration-time storage rewrite', async () => {
		await withKernel(async (kernel) => {
			hydrateGrant(kernel);
			const actual = evidence(kernel);
			actual.storage.choice.cookie = POLICY_RECORDS['legacy-no-hash'].raw;
			const baseline = {
				logs: emptyLogs(),
				storage: structuredClone(actual.storage),
			};
			await checkObservation(actual, { storage: 'unchanged' }, baseline);
			actual.storage.choice.cookie += ' ';
			await expect(
				checkObservation(actual, { storage: 'unchanged' }, baseline)
			).rejects.toThrow('corrupted-observation');
		});
	});
});

describe('suite execution contract', () => {
	test('passes inputs only, no scenario steps or expected normalization', () => {
		const scenario = POLICY_SCENARIOS.find(
			(item) => item.id === 'legacy-identified-grant'
		);
		if (!scenario) {
			throw new Error('Missing fixture');
		}
		const setup = policySessionSetup(scenario, () => POLICY_NOW);
		expect(Object.keys(setup).sort()).toEqual([
			'clock',
			'gpc',
			'policy',
			'probeGates',
			'storage',
		]);
		expect(Object.keys(setup.storage.cookie ?? {}).sort()).toEqual([
			'encoding',
			'raw',
		]);
		expect(setup.clock.now()).toBe(POLICY_NOW);
	});

	test('always disposes after an operation throws', async () => {
		let disposed = 0;
		const driver: TestDriver = {
			...unsupported(),
			createPolicySession: () =>
				Promise.resolve({
					baseline: { logs: emptyLogs(), storage: emptyStorage() },
					dispose: () => {
						disposed += 1;
					},
					execute: () => {
						throw new Error('operation failed');
					},
					observe: () => {
						throw new Error('must not observe');
					},
				}),
		};
		await expect(
			executePolicyScenario(driver, api, {
				covers: ['A'],
				id: 'dispose',
				now: POLICY_NOW,
				policy: POLICY_CHOICE,
				steps: [{ expect: {}, operation: { kind: 'hydrate' } }],
			})
		).rejects.toThrow('dispose');
		expect(disposed).toBe(1);
	});

	test('does not swallow missing-capability errors', async () => {
		const bodies: (() => void | Promise<void>)[] = [];
		conformanceTest(
			{ ...api, test: (_name, body) => bodies.push(body) },
			'missing',
			() => {
				throw new DriverNotImplementedError('vue', 'SSR');
			}
		);
		await Promise.all(
			bodies.map(async (body) => {
				await expect(Promise.resolve().then(body)).rejects.toBeInstanceOf(
					DriverNotImplementedError
				);
			})
		);
	});

	for (const framework of ['react', 'nextjs', 'vue', 'svelte'] as const) {
		test(`${framework} requires the policy session capability`, async () => {
			const [scenario] = POLICY_SCENARIOS;
			if (!scenario) {
				throw new Error('Missing scenarios');
			}
			await expect(
				executePolicyScenario(unsupported(framework), api, scenario)
			).rejects.toBeInstanceOf(DriverNotImplementedError);
		});
	}

	test('aggregate registers every policy scenario exactly once', () => {
		const names: string[] = [];
		runConformanceSuite(unsupported(), {
			...api,
			describe: (_name, body) => body(),
			test: (name) => names.push(name),
		});
		for (const scenario of POLICY_SCENARIOS) {
			expect(names.filter((name) => name === scenario.id)).toHaveLength(1);
		}
	});

	test('Solid has one explicit primitives-only exclusion', async () => {
		const bodies: (() => void | Promise<void>)[] = [];
		const names: string[] = [];
		runConformanceSuite(unsupported('solid'), {
			...api,
			describe: (_name, body) => body(),
			test: (name, body) => {
				names.push(name);
				bodies.push(body);
			},
		});
		expect(names).toEqual([
			'[solid] primitives-only: consent adapter excluded',
		]);
		await Promise.all(bodies.map((body) => body()));
	});
});

test.each([
	'valid',
	'corrupt-tc',
	'missing-vendor',
	'missing-purpose',
	'forged-map',
	'wrong-clock',
	'wrong-status',
])('IAB authority evidence: %s', async (kind) => {
	const kernel = createConsentKernel({ now: POLICY_NOW });
	try {
		const actual = evidence(kernel);
		const gvl = new GVL({
			...MINIMAL_GVL,
			features: {},
			purposes: {
				1: { ...MINIMAL_GVL.purposes[1], illustrations: [] },
				2: { ...MINIMAL_GVL.purposes[2], illustrations: [] },
			},
			specialFeatures: {},
			specialPurposes: {},
			stacks: {},
			vendors: {
				755: {
					...MINIMAL_GVL.vendors[755],
					features: [],
					flexiblePurposes: [],
					id: 755,
					legIntPurposes: [],
					purposes: [1, 2],
					specialFeatures: [],
					specialPurposes: [],
					urls: [],
				},
			},
		});
		await gvl.readyPromise;
		const model = new TCModel(gvl);
		model.cmpId = 28;
		model.created = new Date(POLICY_NOW);
		model.lastUpdated = new Date(POLICY_NOW);
		if (kind !== 'missing-vendor') {
			model.vendorConsents.set(755);
		}
		if (kind !== 'missing-purpose') {
			model.purposeConsents.set(1);
		}
		model.vendorsDisclosed.set(755);
		const tcString = TCString.encode(model);
		actual.iabTargetAllowed = kind !== 'wrong-status';
		actual.snapshot.iab = {
			authority: {
				choiceFingerprint: POLICY_CHOICE.choice.fingerprint,
				confirmedAt:
					kind === 'wrong-clock' ? POLICY_NOW - 86400000 : POLICY_NOW,
				expiresAt: POLICY_NOW + 1000,
				purposeConsents: { 1: true },
				purposeLegitimateInterests: {},
				specialFeatureOptIns: {},
				tcString: kind === 'corrupt-tc' ? 'not-a-tc-string' : tcString,
				vendorConsents: kind === 'forged-map' ? {} : { '755': true },
				vendorLegitimateInterests: {},
			},
			enabled: true,
		};
		const check = checkObservation(actual, { iabTargetAllowed: true });
		if (kind === 'valid') {
			await check;
		} else {
			await expect(check).rejects.toThrow();
		}
	} finally {
		kernel.dispose();
	}
});

test('broad GPC keeps unmapped grants and original receipts without recording a choice', async () => {
	setSystemTime(POLICY_NOW);
	const resolved = resolution(true, true);
	if (resolved.status !== 'matched') {
		throw new Error('Missing matched fixture');
	}
	resolved.policy.scope = [
		'experience',
		'functionality',
		'marketing',
		'measurement',
	];
	const record = POLICY_RECORDS['legacy-broad-grant'];
	const kernel = createConsentKernel({
		initialPolicyResolution: resolved,
		initialPrivacySignals: { gpc: true },
		now: POLICY_NOW,
	});
	const events: { name: string; payload: unknown }[] = [];
	kernel.events.on('choice:recorded', (event) =>
		events.push({ name: event.type, payload: event })
	);
	try {
		kernel.hydrate(
			readStoredRecordsFromCookieHeader(
				`c15t=${encodeURIComponent(record.raw)}`,
				undefined,
				POLICY_NOW
			)
		);
		const original = kernel.getSnapshot().explicitChoice;
		await kernel.commands.init();
		const expected = {
			choice: record.expected.choice,
			consentCallbacks: 0,
			events: { 'choice-recorded': 0 },
			permissions: {
				experience: true,
				functionality: true,
				marketing: false,
				measurement: false,
			},
		} as const;
		await checkObservation(
			evidence(kernel, { ...emptyLogs(), events }),
			expected
		);
		kernel.set.privacySignals({ gpc: false });
		expect(kernel.getSnapshot().explicitChoice).toBe(original);
		await checkObservation(
			evidence(kernel, { ...emptyLogs(), events }),
			expected
		);
		const corrupt = evidence(kernel);
		corrupt.snapshot.effectivePermissions.experience = false;
		await expect(checkObservation(corrupt, expected)).rejects.toThrow();
	} finally {
		kernel.dispose();
		setSystemTime();
	}
});
