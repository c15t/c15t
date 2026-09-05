import { TCString } from '@iabtechlabtcf/core';

import { POLICY_EVENT_NAMES } from '../contract/events';
import type {
	PolicyEvidence,
	PolicyLogs,
	PolicySession,
	PolicySessionSetup,
	PolicyStorageBytes,
} from '../contract/policy-driver';
import type {
	PolicyObservation,
	PolicyScenario,
	ScenarioPolicy,
} from '../contract/policy-scenarios';
import { DriverNotImplementedError } from '../driver';
import type { TestDriver } from '../driver';
import { POLICY_RECORDS } from '../fixtures/policy-records';
import type { PolicyRecordId } from '../fixtures/policy-records';
import { POLICY_SCENARIOS } from '../fixtures/policy-scenarios';
import { conformanceTest } from './helpers';
import type { SuiteApi } from './helpers';

const isRecordId = (id: string): id is PolicyRecordId =>
	Object.hasOwn(POLICY_RECORDS, id);

/** Resolve only raw inputs; normalization expectations never cross the boundary. */
export const policySessionSetup = function policySessionSetup(
	scenario: PolicyScenario,
	now: () => number
): PolicySessionSetup {
	const storage: PolicySessionSetup['storage'] = {};
	for (const location of [
		'cookie',
		'localStorage',
		'legacyLocalStorage',
	] as const) {
		const id = scenario.storage?.[location];
		if (id === undefined) {
			continue;
		}
		if (!isRecordId(id)) {
			throw new Error(`Unknown policy record: ${id}`);
		}
		const { raw, encoding } = POLICY_RECORDS[id];
		storage[location] = { encoding, raw };
	}
	return {
		clock: { now },
		gpc: scenario.gpc ?? false,
		policy: structuredClone(scenario.policy),
		probeGates: scenario.probeGates ?? false,
		storage,
	};
};

const count = (entries: readonly { name: string }[], name: string): number =>
	entries.filter((entry) => entry.name === name).length;

const recordPayload = function recordPayload(
	value: unknown
): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new Error('Missing event-shaped callback payload');
	}
	return Object.fromEntries(Object.entries(value));
};

const assertCallbackPayloads = function assertCallbackPayloads(
	api: SuiteApi,
	before: PolicyLogs,
	after: PolicyLogs,
	now: number
): void {
	const events = after.events.slice(before.events.length);
	const invocations = after.callbacks.slice(before.callbacks.length);
	for (const [eventName, callbackName, fields] of [
		[
			'choice:recorded',
			'onChoiceRecorded',
			['snapshot', 'confirmed', 'actionAt'],
		],
		['permissions:changed', 'onPermissionsChanged', ['snapshot', 'previous']],
	] as const) {
		const matchingEvents = events.filter((event) => event.name === eventName);
		const matchingCallbacks = invocations.filter(
			(entry) => entry.name === callbackName
		);
		api.expect(matchingCallbacks.length).toBe(matchingEvents.length);
		for (const [index, event] of matchingEvents.entries()) {
			const eventPayload = recordPayload(event.payload);
			const callbackPayload = recordPayload(matchingCallbacks[index]?.payload);
			for (const field of fields) {
				api.expect(eventPayload[field]).toBeDefined();
				api.expect(callbackPayload[field]).toEqual(eventPayload[field]);
			}
			if (eventName === 'choice:recorded') {
				api.expect(eventPayload.actionAt).toBe(now);
				api.expect(Array.isArray(eventPayload.confirmed)).toBe(true);
			}
		}
	}
};

const assertLogs = function assertLogs(
	api: SuiteApi,
	expected: PolicyObservation,
	before: PolicyLogs,
	after: PolicyLogs
): void {
	for (const key of [
		'events',
		'callbacks',
		'requests',
		'diagnostics',
	] as const) {
		api.expect(after[key].slice(0, before[key].length)).toEqual(before[key]);
	}
	for (const [semantic, wire] of Object.entries(POLICY_EVENT_NAMES)) {
		const amount =
			expected.events?.[semantic as keyof typeof POLICY_EVENT_NAMES];
		if (amount !== undefined) {
			api
				.expect(count(after.events, wire) - count(before.events, wire))
				.toBe(amount);
		}
	}
	if (expected.consentCallbacks !== undefined) {
		api
			.expect(
				count(after.callbacks, 'onChoiceRecorded') -
					count(before.callbacks, 'onChoiceRecorded')
			)
			.toBe(expected.consentCallbacks);
	}
	if (expected.consentRequests !== undefined) {
		const requests = (logs: PolicyLogs) =>
			logs.requests.filter((request) => request.kind === 'consent').length;
		api
			.expect(requests(after) - requests(before))
			.toBe(expected.consentRequests);
	}
	if (expected.diagnostic !== undefined) {
		api
			.expect(
				after.diagnostics
					.slice(before.diagnostics.length)
					.some((message) =>
						/prominence|primaryButton|equal.*(?:accept|reject)/iu.test(message)
					)
			)
			.toBe(true);
	}
};

const assertStorage = function assertStorage(
	api: SuiteApi,
	expected: PolicyObservation['storage'],
	before: PolicyStorageBytes,
	after: PolicyEvidence
): void {
	const bytes = after.storage;
	if (expected === 'unchanged') {
		api.expect(bytes).toEqual(before);
	}
	if (expected === 'cleared') {
		api.expect(bytes).toEqual({
			choice: { cookie: null, localStorage: null },
			legacyLocalStorage: null,
			notice: { cookie: null, localStorage: null },
			privacy: { cookie: null, localStorage: null },
		});
	}
	if (expected === 'notice-only' || expected === 'privacy-only') {
		const changed = expected === 'notice-only' ? 'notice' : 'privacy';
		const unchanged = changed === 'notice' ? 'privacy' : 'notice';
		api.expect(bytes.choice).toEqual(before.choice);
		api.expect(bytes.legacyLocalStorage).toBe(before.legacyLocalStorage);
		api.expect(bytes[unchanged]).toEqual(before[unchanged]);
		api
			.expect(
				JSON.stringify(bytes[changed]) === JSON.stringify(before[changed])
			)
			.toBe(false);
		api.expect(bytes[changed].localStorage).not.toBeNull();
		const persisted: unknown = JSON.parse(
			bytes[changed].localStorage ?? 'null'
		);
		api
			.expect(persisted)
			.toEqual(
				changed === 'notice'
					? after.snapshot.noticeDismissal
					: { directives: after.snapshot.optOutDirectives, version: 1 }
			);
	}
	if (expected === 'choice-v3') {
		api.expect(bytes.choice.localStorage).not.toBeNull();
		const envelope: unknown = JSON.parse(bytes.choice.localStorage ?? 'null');
		api.expect(envelope).toHaveProperty('version');
		if (
			typeof envelope !== 'object' ||
			envelope === null ||
			!('version' in envelope) ||
			!('categories' in envelope)
		) {
			throw new Error('Choice save did not persist a v3 envelope');
		}
		api.expect(envelope.version).toBe(3);
		api
			.expect(envelope.categories)
			.toEqual(after.snapshot.explicitChoice?.categories);
		api
			.expect('subject' in envelope ? envelope.subject : null)
			.toEqual(after.snapshot.subject);
		api.expect(bytes.notice).toEqual(before.notice);
		api.expect(bytes.privacy).toEqual(before.privacy);
	}
};

const assertGateEvidence = function assertGateEvidence(
	api: SuiteApi,
	expected: PolicyObservation,
	after: PolicyEvidence,
	previous?: PolicyEvidence
): void {
	if (expected.gates !== undefined) {
		const { gates } = after;
		if (!gates) {
			throw new Error('Missing real gate probe evidence');
		}
		const priorGates = previous?.gates;
		api
			.expect(gates.scriptLoads)
			.toBeGreaterThanOrEqual(priorGates?.scriptLoads ?? 0);
		api.expect(gates.scriptAttached).toBe(expected.gates.script === 'loaded');
		if (expected.gates.script === 'blocked') {
			api.expect(gates.scriptLoads - (priorGates?.scriptLoads ?? 0)).toBe(0);
		}
		api
			.expect(gates.networkAttempts - (priorGates?.networkAttempts ?? 0))
			.toBeGreaterThan(0);
		api
			.expect(gates.networkCompletions)
			.toBeGreaterThanOrEqual(priorGates?.networkCompletions ?? 0);
		api
			.expect(
				gates.networkCompletions - (priorGates?.networkCompletions ?? 0) > 0
			)
			.toBe(expected.gates.network === 'allowed');
		api
			.expect(gates.iframeSrc !== null)
			.toBe(expected.gates.iframe === 'loaded');
		api
			.expect(gates.iframePlaceholderVisible)
			.toBe(expected.gates.iframe === 'placeholder');
		for (const key of ['ad_storage', 'ad_user_data', 'ad_personalization']) {
			api.expect(gates.consentMode[key]).toBe(expected.gates.consentMode);
		}
	}
};

const assertDomAndGates = function assertDomAndGates(
	api: SuiteApi,
	expected: PolicyObservation,
	after: PolicyEvidence
): void {
	if (expected.firstLayer !== undefined) {
		api.expect(after.dom.firstLayer).toBe(expected.firstLayer);
	}
	if (expected.preferencesOpen !== undefined) {
		api.expect(after.dom.preferencesOpen).toBe(expected.preferencesOpen);
	}
	if (expected.persistentRights !== undefined) {
		api
			.expect([...after.dom.rights].sort())
			.toEqual([...expected.persistentRights].sort());
	}
	if (expected.actions !== undefined) {
		api
			.expect(
				after.dom.actions
					.filter((action) => action.visible)
					.map((action) => action.action)
					.sort()
			)
			.toEqual([...expected.actions].sort());
	}
	if (expected.equivalentActions !== undefined) {
		const accept = after.dom.actions.find(
			(action) => action.action === 'accept'
		);
		const reject = after.dom.actions.find(
			(action) => action.action === 'reject'
		);
		if (!accept || !reject) {
			throw new Error('Missing accept/reject action evidence');
		}
		api.expect(accept.visible).toBe(true);
		api.expect(reject.visible).toBe(true);
		api.expect(accept.interactionDepth).toBe(1);
		api.expect(reject.interactionDepth).toBe(accept.interactionDepth);
		api.expect(accept.group.length).toBeGreaterThan(0);
		api.expect(reject.group).toBe(accept.group);
		api.expect(accept.prominence.length).toBeGreaterThan(0);
		api.expect(reject.prominence).toBe(accept.prominence);
	}
	if (expected.iabTargetAllowed !== undefined) {
		api.expect(after.iabTargetAllowed).toBe(expected.iabTargetAllowed);
	}
};

const assertPolicyTransition = function assertPolicyTransition(
	api: SuiteApi,
	expected: PolicyObservation,
	after: PolicyEvidence,
	previous?: PolicyEvidence
): void {
	const { snapshot } = after;
	if (expected.priorPolicyStateDiscarded !== undefined) {
		if (!previous || previous.snapshot.resolution.status !== 'matched') {
			throw new Error('Discard assertion requires a prior real matched init');
		}
		api.expect(previous.snapshot.resolution.policy).toBeDefined();
		api.expect(previous.snapshot.resolution.policy).not.toBeNull();
		api.expect(typeof previous.snapshot.policySnapshotToken).toBe('string');
		if (previous.snapshot.policyRule.model === 'iab') {
			api.expect(previous.snapshot.iab?.enabled).toBe(true);
		}
		api.expect(snapshot.resolution.policy).toBe(null);
		api.expect(Object.hasOwn(snapshot, 'policyDecision')).toBe(false);
		api.expect(snapshot.policySnapshotToken).toBe(null);
		api.expect(snapshot.iab?.enabled ?? false).toBe(false);
		api.expect(snapshot.policyRule.model).toBe('opt-in');
		api.expect(snapshot.policyRule.prompt).toBe('choice');
		api.expect(snapshot.effectivePermissions.marketing).toBe(false);
		api.expect(snapshot.effectivePermissions.measurement).toBe(false);
	}
	if (expected.iabAuthority === 'absent') {
		api.expect(snapshot.iab?.authority ?? null).toBe(null);
	}
	if (expected.iabAuthority === 'unchanged') {
		if (!previous?.snapshot.iab?.authority) {
			throw new Error(
				'IAB preservation requires previously observed TC authority'
			);
		}
		api
			.expect(snapshot.iab?.authority)
			.toEqual(previous.snapshot.iab.authority);
	}
};

/** Assertions use measured values only; this function does not evaluate policy. */
export const assertPolicyObservation = function assertPolicyObservation(
	api: SuiteApi,
	expected: PolicyObservation,
	before: PolicySession['baseline'],
	after: PolicyEvidence,
	policy: ScenarioPolicy,
	now: number,
	previous?: PolicyEvidence
): void {
	const { snapshot } = after;
	api.expect(snapshot.effectivePermissions.necessary).toBe(true);
	if (expected.prompt !== undefined) {
		api.expect(snapshot.promptRequirement).toEqual(expected.prompt);
	}
	if (expected.choice !== undefined) {
		api.expect(snapshot.explicitChoice).toEqual(expected.choice);
	}
	if (expected.subject !== undefined) {
		api.expect(snapshot.subject).toEqual(expected.subject);
	}
	if (expected.resolution !== undefined) {
		api.expect(snapshot.resolution.status).toBe(expected.resolution);
	}
	for (const [category, value] of Object.entries(expected.permissions ?? {})) {
		api
			.expect(
				snapshot.effectivePermissions[
					category as keyof typeof snapshot.effectivePermissions
				]
			)
			.toBe(value);
	}
	if (expected.standingOptOut !== undefined) {
		api
			.expect(
				[
					...new Set(
						snapshot.optOutDirectives.flatMap(
							(directive) => directive.categories
						)
					),
				].sort()
			)
			.toEqual([...expected.standingOptOut].sort());
	}
	if (expected.noticeDismissal === 'absent') {
		api.expect(snapshot.noticeDismissal).toBe(null);
	}
	if (expected.noticeDismissal === 'current') {
		api.expect(snapshot.noticeDismissal).toEqual({
			dismissedAt: now,
			fingerprint: policy.notice.fingerprint,
			version: 1,
		});
	}
	assertPolicyTransition(api, expected, after, previous);
	assertLogs(api, expected, before.logs, after.logs);
	assertCallbackPayloads(api, before.logs, after.logs, now);
	assertStorage(api, expected.storage, before.storage, after);
	assertDomAndGates(api, expected, after);
	assertGateEvidence(api, expected, after, previous);
	if (expected.iabTargetAllowed === true) {
		const authority = snapshot.iab?.authority;
		if (!authority) {
			throw new Error('Allowed IAB target lacks confirmed authority');
		}
		const decoded = TCString.decode(authority.tcString);
		// Every probe-iab operation uses vendor 755 and purpose 1. Decode
		// the raw TC independently of the adapter's authority maps and gate.
		api.expect(decoded.vendorConsents.has(755)).toBe(true);
		api.expect(decoded.purposeConsents.has(1)).toBe(true);
		api.expect(decoded.vendorsDisclosed.has(755)).toBe(true);
		api.expect(authority.vendorConsents['755']).toBe(true);
		api.expect(authority.purposeConsents[1]).toBe(true);
		api.expect(Number.isSafeInteger(authority.confirmedAt)).toBe(true);
		api.expect(authority.confirmedAt >= 0).toBe(true);
		api.expect(decoded.created.getTime()).toBe(decoded.lastUpdated.getTime());
		api
			.expect(decoded.lastUpdated.getTime() <= authority.confirmedAt)
			.toBe(true);
		api
			.expect(
				authority.confirmedAt - decoded.lastUpdated.getTime() < 86_400_000
			)
			.toBe(true);
		api.expect(authority.choiceFingerprint).toBe(policy.choice.fingerprint);
		api.expect(authority.confirmedAt <= now).toBe(true);
		api.expect(Number.isSafeInteger(authority.expiresAt)).toBe(true);
		api.expect(authority.expiresAt).toBeGreaterThan(now);
		api
			.expect(
				authority.expiresAt <=
					authority.confirmedAt +
						Math.min(policy.choice.maxAgeMs, 395 * 86_400_000)
			)
			.toBe(true);
	}
	if (expected.ssr !== undefined) {
		const { ssr } = after;
		if (!ssr) {
			throw new Error('Missing SSR hydration implementation');
		}
		api.expect(ssr.client.prompt).toEqual(ssr.server.prompt);
		api.expect(ssr.client.prompt).toEqual(snapshot.promptRequirement);
		api.expect(ssr.client.dom).toBe(ssr.server.dom);
		if (ssr.server.firstLayer !== 'hidden') {
			api.expect(ssr.server.dom.trim().length).toBeGreaterThan(0);
		}
		api.expect(ssr.hydrationWarnings).toEqual([]);
		api.expect(ssr.server.now).toBe(now);
		api.expect(ssr.client.now).toBe(now);
		api.expect(ssr.firstLayerHistory.length).toBeGreaterThanOrEqual(2);
		api
			.expect(
				ssr.firstLayerHistory.every((layer) => layer === ssr.server.firstLayer)
			)
			.toBe(true);
		api.expect(ssr.client.firstLayer).toBe(ssr.server.firstLayer);
	}
};

/** Execute one scenario with cleanup on operation, observation or assertion failure. */
export const executePolicyScenario = async function executePolicyScenario(
	driver: TestDriver,
	api: SuiteApi,
	scenario: PolicyScenario
): Promise<void> {
	if (!driver.createPolicySession) {
		throw new DriverNotImplementedError(
			driver.framework,
			'createPolicySession'
		);
	}
	let { now } = scenario;
	let { policy } = scenario;
	const setup = policySessionSetup(scenario, () => now);
	const seededInput = structuredClone(setup.storage);
	const session = await driver.createPolicySession(setup);
	try {
		let before = structuredClone(session.baseline);
		for (const location of [
			'cookie',
			'localStorage',
			'legacyLocalStorage',
		] as const) {
			const seed = seededInput[location];
			if (seed && seed.encoding !== 'v3-choice-json') {
				const bytes =
					location === 'legacyLocalStorage'
						? before.storage.legacyLocalStorage
						: before.storage.choice[location];
				api.expect(bytes).toBe(seed.raw);
			}
		}
		let previous: PolicyEvidence | undefined;
		for (const [index, step] of scenario.steps.entries()) {
			try {
				if (step.operation.kind === 'advance-time') {
					({ now } = step.operation);
				}
				if (step.operation.kind === 'apply-policy' && step.operation.policy) {
					({ policy } = step.operation);
				}
				// Each step depends on the previous operation and its measured evidence.
				// oxlint-disable-next-line no-await-in-loop
				await session.execute(structuredClone(step.operation));
				// oxlint-disable-next-line no-await-in-loop
				const after = structuredClone(await session.observe());
				if (step.operation.kind === 'reload') {
					if (!previous) {
						throw new Error('Reload needs an observed previous session');
					}
					api
						.expect(after.snapshot.explicitChoice)
						.toEqual(previous.snapshot.explicitChoice);
					api.expect(after.snapshot.subject).toEqual(previous.snapshot.subject);
				}
				assertPolicyObservation(
					api,
					step.expect,
					before,
					after,
					policy,
					now,
					previous
				);
				before = { logs: after.logs, storage: after.storage };
				previous = after;
			} catch (cause) {
				throw new Error(
					`${scenario.id} step ${index + 1} (${step.operation.kind}) failed`,
					{ cause }
				);
			}
		}
	} finally {
		await session.dispose();
	}
};

/** Same scenarios and expectations for every supported adapter. */
export const runPolicyScenarioConformance =
	function runPolicyScenarioConformance(
		driver: TestDriver,
		api: SuiteApi,
		scenarios: readonly PolicyScenario[] = POLICY_SCENARIOS
	): void {
		api.describe(`[${driver.framework}] policy scenarios`, () => {
			for (const scenario of scenarios) {
				conformanceTest(api, scenario.id, () =>
					executePolicyScenario(driver, api, scenario)
				);
			}
		});
	};
