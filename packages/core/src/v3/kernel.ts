/**
 * Pure consent kernel.
 *
 * Invariants:
 * - `createConsentKernel()` has zero side effects. No window writes,
 *   no DOM observers, no network, no localStorage. Enforced by the
 *   v3 correctness-gate tests in packages/core/src/__tests__/v3-correctness-gates.test.ts.
 * - `getSnapshot()` is non-allocating in the steady state — returns the
 *   current frozen snapshot by reference. Adapters can use `===` to bail out.
 * - `set.*` methods are synchronous. They produce a new frozen snapshot
 *   (structural sharing) and notify subscribers in insertion order.
 *   Notification cost is O(n) in subscribers.
 * - `commands.*` are async but still do not touch browser globals.
 *   Network calls, DOM mutations, and localStorage live in opt-in boot
 *   modules under c15t/v3/modules/*.
 */
import type {
	LocationResponse,
	PolicyDecision,
	PolicyScopeMode,
	ResolvedPolicy,
} from '@c15t/schema/types';
import { generateSubjectId } from '../libs/generate-subject-id';
import type { AllConsentNames } from '../types/consent-types';
import { allConsentNames } from '../types/consent-types';
import { applyPolicyToConsents, deriveActiveUI, deriveModel } from './policy';
import type {
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	InitContext,
	InitResponse,
	InitResult,
	KernelActiveUI,
	KernelBranding,
	KernelConfig,
	KernelEvent,
	KernelIABState,
	KernelModel,
	KernelOverrides,
	KernelTranslations,
	KernelTransport,
	KernelUser,
	Listener,
	SavePayload,
	SaveResult,
	Unsubscribe,
} from './types';

const DEFAULT_CONSENTS: ConsentState = {
	necessary: true,
	functionality: false,
	marketing: false,
	measurement: false,
	experience: false,
};

const DEFAULT_IAB: KernelIABState = {
	enabled: false,
	gvl: null,
	customVendors: [],
	cmpId: null,
	vendorConsents: {},
	vendorLegitimateInterests: {},
	purposeConsents: {},
	purposeLegitimateInterests: {},
	specialFeatureOptIns: {},
	tcString: null,
};

function buildInitialConsents(
	initial: Partial<ConsentState> | undefined
): ConsentState {
	if (!initial) {
		return { ...DEFAULT_CONSENTS };
	}
	const merged: ConsentState = { ...DEFAULT_CONSENTS };
	for (const name of allConsentNames) {
		if (name in initial && typeof initial[name] === 'boolean') {
			merged[name] = initial[name] as boolean;
		}
	}
	return merged;
}

function buildInitialIab(
	initial: Partial<KernelIABState> | undefined
): KernelIABState | null {
	if (!initial) return null;
	return {
		...DEFAULT_IAB,
		...initial,
	};
}

function freezeSnapshot(snapshot: ConsentSnapshot): ConsentSnapshot {
	Object.freeze(snapshot.consents);
	Object.freeze(snapshot.overrides);
	if (snapshot.user) Object.freeze(snapshot.user);
	if (snapshot.translations) Object.freeze(snapshot.translations);
	if (snapshot.policy) Object.freeze(snapshot.policy);
	if (snapshot.policyDecision) Object.freeze(snapshot.policyDecision);
	if (snapshot.policyBanner) Object.freeze(snapshot.policyBanner);
	if (snapshot.policyDialog) Object.freeze(snapshot.policyDialog);
	if (snapshot.iab) Object.freeze(snapshot.iab);
	if (snapshot.location) Object.freeze(snapshot.location);
	Object.freeze(snapshot.policyCategories);
	return Object.freeze(snapshot) as ConsentSnapshot;
}

export function createConsentKernel(config: KernelConfig = {}): ConsentKernel {
	const transport: KernelTransport | undefined = config.transport;

	const initialIab = buildInitialIab(config.initialIab);
	const initialPolicy = config.initialPolicy
		? { ...config.initialPolicy }
		: null;
	const initialModel = deriveModel(initialPolicy, initialIab?.enabled ?? false);
	const initialPolicyResult = applyPolicyToConsents({
		consents: buildInitialConsents(config.initialConsents),
		hasConsented: false,
		policy: initialPolicy,
	});

	let snapshot: ConsentSnapshot = freezeSnapshot({
		consents: initialPolicyResult.consents,
		overrides: { ...(config.initialOverrides ?? {}) },
		user: config.initialUser ? { ...config.initialUser } : null,
		subjectId: config.initialSubjectId ?? null,
		hasConsented: false,
		revision: 0,
		location: config.initialLocation ? { ...config.initialLocation } : null,
		translations: config.initialTranslations
			? { ...config.initialTranslations }
			: null,
		branding: config.initialBranding ?? null,
		policy: initialPolicy,
		policyDecision: config.initialPolicyDecision
			? { ...config.initialPolicyDecision }
			: null,
		policySnapshotToken: config.initialPolicySnapshotToken ?? null,
		model: initialModel,
		activeUI: deriveActiveUI(initialModel, initialPolicy),
		policyCategories: initialPolicyResult.policyCategories,
		policyScopeMode: initialPolicyResult.policyScopeMode,
		policyBanner: config.initialPolicy?.ui?.banner
			? { ...config.initialPolicy.ui.banner }
			: null,
		policyDialog: config.initialPolicy?.ui?.dialog
			? { ...config.initialPolicy.ui.dialog }
			: null,
		iab: initialIab,
	});

	const snapshotListeners = new Set<Listener<ConsentSnapshot>>();
	const eventListeners = new Map<
		KernelEvent['type'],
		Set<Listener<KernelEvent>>
	>();

	function notifySnapshot(): void {
		for (const listener of snapshotListeners) {
			listener(snapshot);
		}
	}

	function emit(event: KernelEvent): void {
		const bucket = eventListeners.get(event.type);
		if (!bucket) return;
		for (const listener of bucket) {
			listener(event);
		}
	}

	interface AdvancePatch {
		consents?: ConsentState;
		overrides?: KernelOverrides;
		user?: KernelUser | null;
		subjectId?: string | null;
		hasConsented?: boolean;
		location?: LocationResponse | null;
		translations?: KernelTranslations | null;
		branding?: KernelBranding | null;
		policy?: ResolvedPolicy | null;
		policyDecision?: PolicyDecision | null;
		policySnapshotToken?: string | null;
		model?: KernelModel;
		activeUI?: KernelActiveUI;
		policyCategories?: AllConsentNames[];
		policyScopeMode?: PolicyScopeMode;
		policyBanner?: ConsentSnapshot['policyBanner'];
		policyDialog?: ConsentSnapshot['policyDialog'];
		iab?: KernelIABState | null;
	}

	function advance(patch: AdvancePatch): void {
		snapshot = freezeSnapshot({
			consents: patch.consents ?? snapshot.consents,
			overrides: patch.overrides ?? snapshot.overrides,
			user: patch.user === undefined ? snapshot.user : patch.user,
			subjectId:
				patch.subjectId === undefined ? snapshot.subjectId : patch.subjectId,
			hasConsented: patch.hasConsented ?? snapshot.hasConsented,
			revision: snapshot.revision + 1,
			location:
				patch.location === undefined ? snapshot.location : patch.location,
			translations:
				patch.translations === undefined
					? snapshot.translations
					: patch.translations,
			branding:
				patch.branding === undefined ? snapshot.branding : patch.branding,
			policy: patch.policy === undefined ? snapshot.policy : patch.policy,
			policyDecision:
				patch.policyDecision === undefined
					? snapshot.policyDecision
					: patch.policyDecision,
			policySnapshotToken:
				patch.policySnapshotToken === undefined
					? snapshot.policySnapshotToken
					: patch.policySnapshotToken,
			model: patch.model === undefined ? snapshot.model : patch.model,
			activeUI:
				patch.activeUI === undefined ? snapshot.activeUI : patch.activeUI,
			policyCategories:
				patch.policyCategories === undefined
					? snapshot.policyCategories
					: patch.policyCategories,
			policyScopeMode:
				patch.policyScopeMode === undefined
					? snapshot.policyScopeMode
					: patch.policyScopeMode,
			policyBanner:
				patch.policyBanner === undefined
					? snapshot.policyBanner
					: patch.policyBanner,
			policyDialog:
				patch.policyDialog === undefined
					? snapshot.policyDialog
					: patch.policyDialog,
			iab: patch.iab === undefined ? snapshot.iab : patch.iab,
		});
		notifySnapshot();
	}

	/**
	 * Fold an InitResponse onto the snapshot. Everything here is pure —
	 * pure data in, pure data out. No DOM, no network.
	 */
	function applyInitResponse(response: InitResponse): void {
		const patch: AdvancePatch = {};

		if (response.resolvedOverrides) {
			patch.overrides = {
				...snapshot.overrides,
				...response.resolvedOverrides,
			};
		}
		if (response.location !== undefined) {
			patch.location = response.location;
		}
		if (response.translations !== undefined) {
			patch.translations = response.translations;
		}
		if (response.branding !== undefined) {
			patch.branding = response.branding;
		}
		if (response.policy !== undefined) {
			patch.policy = response.policy;
			patch.policyBanner = response.policy.ui?.banner ?? null;
			patch.policyDialog = response.policy.ui?.dialog ?? null;
		}
		if (response.policyDecision !== undefined) {
			patch.policyDecision = response.policyDecision;
		}
		if (response.policySnapshotToken !== undefined) {
			patch.policySnapshotToken = response.policySnapshotToken;
		}

		// IAB passthrough: fold gvl / customVendors / cmpId into the iab
		// slice. The IAB module at c15t/v3/modules/iab decides whether to
		// enable itself based on the presence of gvl.
		if (
			response.gvl !== undefined ||
			response.customVendors !== undefined ||
			response.cmpId !== undefined
		) {
			const baseline = snapshot.iab ?? DEFAULT_IAB;
			const nextIab: KernelIABState = {
				...baseline,
				gvl: response.gvl !== undefined ? response.gvl : baseline.gvl,
				customVendors:
					response.customVendors !== undefined
						? response.customVendors
						: baseline.customVendors,
				cmpId: response.cmpId !== undefined ? response.cmpId : baseline.cmpId,
			};
			// Server explicitly returned `gvl: null` → IAB disabled for
			// this request (non-IAB region on a 200 response).
			if (response.gvl === null) {
				nextIab.enabled = false;
			}
			patch.iab = nextIab;
		}

		// Merge server-side consent state with current consents.
		if (response.consents) {
			const nextConsents: ConsentState = { ...snapshot.consents };
			let changed = false;
			for (const name of allConsentNames) {
				if (
					name in response.consents &&
					typeof response.consents[name] === 'boolean' &&
					nextConsents[name] !== response.consents[name]
				) {
					nextConsents[name] = response.consents[name] as boolean;
					changed = true;
				}
			}
			if (changed) patch.consents = nextConsents;
		}
		if (response.hasConsented !== undefined) {
			patch.hasConsented = response.hasConsented;
		}

		// Derive model / activeUI / policy-filtered categories after all
		// fields in the patch are resolved. Policy derivations depend on
		// the final effective policy + iab.enabled, so compute them last.
		const effectivePolicy =
			patch.policy !== undefined ? patch.policy : snapshot.policy;
		const effectiveIabEnabled =
			(patch.iab !== undefined ? patch.iab : snapshot.iab)?.enabled ?? false;

		const nextModel = deriveModel(effectivePolicy, effectiveIabEnabled);
		patch.model = nextModel;
		patch.activeUI = deriveActiveUI(nextModel, effectivePolicy);

		const consentsForPolicy =
			patch.consents !== undefined ? patch.consents : snapshot.consents;
		const hasConsentedForPolicy =
			patch.hasConsented !== undefined
				? patch.hasConsented
				: snapshot.hasConsented;
		const policyResult = applyPolicyToConsents({
			consents: consentsForPolicy,
			hasConsented: hasConsentedForPolicy,
			policy: effectivePolicy,
		});
		patch.consents = policyResult.consents;
		patch.policyCategories = policyResult.policyCategories;
		patch.policyScopeMode = policyResult.policyScopeMode;

		if (Object.keys(patch).length > 0) {
			advance(patch);
			emit({ type: 'init:applied', snapshot });
		}
	}

	const kernel: ConsentKernel = {
		getSnapshot() {
			return snapshot;
		},

		subscribe(listener) {
			snapshotListeners.add(listener);
			return () => {
				snapshotListeners.delete(listener);
			};
		},

		set: {
			consent(input) {
				const nextConsents: ConsentState = { ...snapshot.consents };
				let changed = false;
				for (const name of allConsentNames) {
					if (
						name in input &&
						typeof input[name] === 'boolean' &&
						nextConsents[name] !== input[name]
					) {
						nextConsents[name] = input[name] as boolean;
						changed = true;
					}
				}
				if (!changed) return;
				advance({ consents: nextConsents });
				emit({ type: 'consent:set', snapshot });
			},

			overrides(input) {
				const nextOverrides: KernelOverrides = {
					...snapshot.overrides,
					...input,
				};
				advance({ overrides: nextOverrides });
				emit({ type: 'overrides:set', snapshot });
			},

			language(code) {
				const nextOverrides: KernelOverrides = {
					...snapshot.overrides,
					language: code,
				};
				advance({ overrides: nextOverrides });
				emit({ type: 'overrides:set', snapshot });
			},

			subjectId(id) {
				if (snapshot.subjectId === id) return;
				advance({ subjectId: id });
			},

			hasConsented(value) {
				if (snapshot.hasConsented === value) return;
				advance({ hasConsented: value });
			},

			activeUI(ui) {
				if (snapshot.activeUI === ui) return;
				advance({ activeUI: ui });
			},

			iab(patch) {
				const baseline = snapshot.iab ?? DEFAULT_IAB;
				const nextIab: KernelIABState = { ...baseline, ...patch };

				// Fast-path no-op detection for common scalar updates.
				// Object fields (vendorConsents etc.) always allocate a new
				// reference; caller is responsible for avoiding churn.
				let changed = false;
				for (const key of Object.keys(nextIab) as (keyof KernelIABState)[]) {
					if (nextIab[key] !== baseline[key]) {
						changed = true;
						break;
					}
				}
				// If previously null, treat any assignment as a change.
				if (!snapshot.iab && patch) changed = true;
				if (!changed) return;

				// If enable/disable flipped, re-derive model + activeUI.
				const patchToApply: AdvancePatch = { iab: nextIab };
				if (nextIab.enabled !== (snapshot.iab?.enabled ?? false)) {
					const nextModel = deriveModel(snapshot.policy, nextIab.enabled);
					patchToApply.model = nextModel;
					patchToApply.activeUI = deriveActiveUI(nextModel, snapshot.policy);
				}
				advance(patchToApply);
				emit({ type: 'iab:set', snapshot });
			},
		},

		commands: {
			async init(): Promise<InitResult> {
				emit({ type: 'command:init:started' });

				if (!transport?.init) {
					const result: InitResult = { ok: true };
					emit({ type: 'command:init:completed', result });
					return result;
				}

				try {
					const ctx: InitContext = {
						overrides: snapshot.overrides,
						user: snapshot.user,
					};
					const response = await transport.init(ctx);
					applyInitResponse(response);
					const result: InitResult = { ok: true };
					emit({ type: 'command:init:completed', result });
					return result;
				} catch (error) {
					emit({ type: 'command:error', command: 'init', error });
					const result: InitResult = { ok: false, error };
					emit({ type: 'command:init:completed', result });
					return result;
				}
			},

			async save(input): Promise<SaveResult> {
				emit({ type: 'command:save:started' });
				const subjectId = snapshot.subjectId ?? generateSubjectId();
				const uiSource = snapshot.activeUI;
				let consentAction: SavePayload['consentAction'] = 'custom';
				if (input === 'all') {
					consentAction = 'all';
					const all: ConsentState = { ...snapshot.consents };
					for (const name of allConsentNames) {
						all[name] = true;
					}
					advance({
						consents: all,
						subjectId,
						hasConsented: true,
						activeUI: 'none',
					});
				} else if (input === 'none') {
					consentAction = 'necessary';
					const none: ConsentState = { ...snapshot.consents };
					for (const name of allConsentNames) {
						none[name] = name === 'necessary';
					}
					advance({
						consents: none,
						subjectId,
						hasConsented: true,
						activeUI: 'none',
					});
				} else if (input && typeof input === 'object') {
					const next: ConsentState = { ...snapshot.consents };
					let changed = false;
					for (const name of allConsentNames) {
						if (
							name in input &&
							typeof input[name] === 'boolean' &&
							next[name] !== input[name]
						) {
							next[name] = input[name] as boolean;
							changed = true;
						}
					}
					if (changed) {
						advance({
							consents: next,
							subjectId,
							hasConsented: true,
							activeUI: 'none',
						});
					} else if (!snapshot.hasConsented) {
						advance({ subjectId, hasConsented: true, activeUI: 'none' });
					} else if (snapshot.activeUI !== 'none') {
						advance({ subjectId, activeUI: 'none' });
					} else if (snapshot.subjectId !== subjectId) {
						advance({ subjectId });
					}
				} else {
					advance({ subjectId, hasConsented: true, activeUI: 'none' });
				}

				if (!transport?.save) {
					const result: SaveResult = { ok: true, subjectId };
					emit({ type: 'command:save:completed', result });
					return result;
				}

				try {
					const payload: SavePayload = {
						subjectId,
						consents: snapshot.consents,
						overrides: snapshot.overrides,
						user: snapshot.user,
						model: snapshot.model,
						uiSource,
						consentAction,
						policySnapshotToken: snapshot.policySnapshotToken,
						tcString: snapshot.iab?.tcString ?? null,
					};
					const result = await transport.save(payload);
					if (result.subjectId && result.subjectId !== snapshot.subjectId) {
						advance({ subjectId: result.subjectId });
					}
					emit({ type: 'command:save:completed', result });
					return result;
				} catch (error) {
					emit({ type: 'command:error', command: 'save', error });
					const result: SaveResult = { ok: false };
					emit({ type: 'command:save:completed', result });
					return result;
				}
			},

			async identify(user: KernelUser): Promise<void> {
				advance({ user: { ...user } });
				emit({ type: 'user:identified', snapshot });
				if (transport?.identify) {
					try {
						await transport.identify({ ...user });
					} catch (error) {
						emit({ type: 'command:error', command: 'identify', error });
					}
				}
			},
		},

		events: {
			on(type, listener) {
				let bucket = eventListeners.get(type);
				if (!bucket) {
					bucket = new Set();
					eventListeners.set(type, bucket);
				}
				const castListener = listener as Listener<KernelEvent>;
				bucket.add(castListener);
				const unsubscribe: Unsubscribe = () => {
					bucket?.delete(castListener);
				};
				return unsubscribe;
			},
			emit(event) {
				emit(event);
			},
		},
	};

	return kernel;
}
