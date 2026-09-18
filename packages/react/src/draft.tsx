'use client';

import type {
	AllConsentNames,
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	SaveResult,
	SaveInput,
} from '@c15t/core';
import { deniedVendorIds } from '@c15t/core';
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from 'react';
import type { ReactNode } from 'react';

import { KernelContext, ProviderServicesContext } from './context';
import { useUIConfig } from './ui-config-context';
import { saveConsentUI } from './ui-save';

/** A local, unmasked selection, committed only by an explicit save. */
export interface ConsentDraftHandle {
	values: Readonly<ConsentState>;
	displayedCategories: readonly AllConsentNames[];
	/**
	 * Granted flag per declared vendor. Seeded from the denials the gate
	 * honors, so a vendor declared `disabled` reads `true` whatever an older
	 * record says; every vendor not denied is `true`. Empty under an `iab`
	 * policy.
	 */
	vendors: Readonly<Record<string, boolean>>;
	isDirty: boolean;
	/** A policy or displayed-category change requires reset and review before saving. */
	isStale: boolean;
	set: (category: AllConsentNames, value: boolean) => void;
	update: (patch: Partial<ConsentState>) => void;
	/**
	 * Stage one vendor's grant. Recorded by the next save. Ignored for a
	 * vendor that is not declared or is declared `disabled`, since the kernel
	 * would drop the grant on save.
	 */
	setVendor: (vendorId: string, granted: boolean) => void;
	acceptAll: () => void;
	rejectAll: () => void;
	save: () => Promise<SaveResult>;
	reset: () => void;
}
interface DraftSnapshot {
	values: ConsentState;
	displayedCategories: readonly AllConsentNames[];
	vendors: Record<string, boolean>;
	isDirty: boolean;
	isStale: boolean;
}
/**
 * Defines an own enumerable data property. Plain assignment would route a
 * valid `__proto__` vendor id through the prototype setter and drop it, so
 * that vendor could never become dirty or travel with a save.
 */
const setOwn = function setOwn(
	target: Record<string, boolean>,
	key: string,
	value: boolean
): void {
	Object.defineProperty(target, key, {
		configurable: true,
		enumerable: true,
		value,
		writable: true,
	});
};
const seedVendors = function seedVendors(
	snapshot: ConsentSnapshot
): Record<string, boolean> {
	const grants: Record<string, boolean> = {};
	if (snapshot.model === 'iab') {
		return grants;
	}
	// The kernel's own gate view: a stale denial for a vendor now declared
	// `disabled` does not count, so the draft never reports a vendor as off
	// while every gate allows it.
	const denied = deniedVendorIds(snapshot) ?? new Set<string>();
	for (const vendor of snapshot.vendors?.declared ?? []) {
		setOwn(grants, vendor.id, !denied.has(vendor.id));
	}
	return grants;
};
/** Ids a save may toggle: declared and not `disabled`, mirroring the kernel. */
const toggleableVendorIds = function toggleableVendorIds(
	snapshot: ConsentSnapshot
): ReadonlySet<string> {
	const ids = new Set<string>();
	if (snapshot.model === 'iab') {
		return ids;
	}
	for (const vendor of snapshot.vendors?.declared ?? []) {
		if (vendor.disabled !== true) {
			ids.add(vendor.id);
		}
	}
	return ids;
};
const sameGrants = function sameGrants(
	left: Readonly<Record<string, boolean>>,
	right: Readonly<Record<string, boolean>>
): boolean {
	const keys = Object.keys(left);
	return (
		keys.length === Object.keys(right).length &&
		keys.every((key) => left[key] === right[key])
	);
};
const seed = function seed(
	snapshot: ConsentSnapshot,
	defaults?: Partial<ConsentState>
): ConsentState {
	const values: ConsentState = {
		experience: false,
		functionality: false,
		marketing: false,
		measurement: false,
		necessary: true,
	};
	for (const category of snapshot.evaluationPolicy.choiceScope ??
		snapshot.policyRule.scope) {
		values[category] =
			snapshot.explicitChoice?.categories[category]?.value ??
			defaults?.[category] ??
			(snapshot.policyRule.model === 'opt-out' ||
				snapshot.policyRule.preselectedCategories.includes(category));
	}
	return values;
};
const createDraftStore = function createDraftStore(
	kernel: ConsentKernel,
	defaults?: Partial<ConsentState>
) {
	let revision = 0;
	let saveSequence = 0;
	let source = kernel.getSnapshot();
	let base = seed(source, defaults);
	let baseVendors = seedVendors(source);
	let toggleable = toggleableVendorIds(source);
	let { fingerprint } = source.evaluationPolicy.choice;
	let current: DraftSnapshot = {
		displayedCategories: [
			'necessary',
			...(source.evaluationPolicy.choiceScope ?? source.policyRule.scope),
		],
		isDirty: false,
		isStale: false,
		values: base,
		vendors: baseVendors,
	};
	const listeners = new Set<() => void>();
	const publish = (next: DraftSnapshot) => {
		current = next;
		for (const listener of listeners) {
			listener();
		}
	};
	const isDirty = (
		values: ConsentState,
		vendors: Readonly<Record<string, boolean>>
	) =>
		current.displayedCategories.some(
			(category) => values[category] !== base[category]
		) || !sameGrants(vendors, baseVendors);
	const reset = () => {
		revision += 1;
		source = kernel.getSnapshot();
		base = seed(source, defaults);
		baseVendors = seedVendors(source);
		toggleable = toggleableVendorIds(source);
		({ fingerprint } = source.evaluationPolicy.choice);
		publish({
			displayedCategories: [
				'necessary',
				...(source.evaluationPolicy.choiceScope ?? source.policyRule.scope),
			],
			isDirty: false,
			isStale: false,
			values: base,
			vendors: baseVendors,
		});
	};
	const update = (patch: Partial<ConsentState>) => {
		const values = { ...current.values };
		let changed = false;
		for (const category of current.displayedCategories) {
			if (
				category !== 'necessary' &&
				typeof patch[category] === 'boolean' &&
				values[category] !== patch[category]
			) {
				values[category] = patch[category];
				changed = true;
			}
		}
		if (changed) {
			revision += 1;
			publish({
				...current,
				isDirty: isDirty(values, current.vendors),
				values,
			});
		}
	};
	const updateVendors = (patch: Readonly<Record<string, boolean>>) => {
		const vendors = { ...current.vendors };
		let changed = false;
		for (const [id, granted] of Object.entries(patch)) {
			// A `disabled` vendor is listed but not toggleable: the kernel drops
			// a grant for it on save, so staging one would only dirty the draft.
			if (
				toggleable.has(id) &&
				typeof granted === 'boolean' &&
				vendors[id] !== granted
			) {
				setOwn(vendors, id, granted);
				changed = true;
			}
		}
		if (changed) {
			revision += 1;
			publish({
				...current,
				isDirty: isDirty(current.values, vendors),
				vendors,
			});
		}
	};
	/** Every declared vendor granted: what a bulk action leaves behind. */
	const allVendorsOn = () => {
		const grants: Record<string, boolean> = {};
		for (const id of Object.keys(baseVendors)) {
			setOwn(grants, id, true);
		}
		return grants;
	};
	const sync = () => {
		const next = kernel.getSnapshot();
		if (
			source.explicitChoice === next.explicitChoice &&
			source.policyRule === next.policyRule &&
			source.evaluationPolicy === next.evaluationPolicy &&
			source.vendors === next.vendors &&
			source.vendorChoice === next.vendorChoice &&
			source.model === next.model
		) {
			return;
		}
		const nextScope =
			next.evaluationPolicy.choiceScope ?? next.policyRule.scope;
		const scopeChanged =
			current.displayedCategories.length !== nextScope.length + 1 ||
			nextScope.some(
				(category) => !current.displayedCategories.includes(category)
			);
		// A changed vendor list is material too: the draft's vendor grants are
		// keyed by the declared ids, so a new or removed vendor needs a reset.
		// Only the ids matter here; a recorded grant change is what a save
		// produces and reseeds through the clean-draft path below.
		const nextIds = Object.keys(seedVendors(next)).sort();
		const baseIds = Object.keys(baseVendors).sort();
		// Toggleability is part of the shape too: a vendor that moves between
		// `disabled` and toggleable changes which switches may be staged.
		const nextToggleable = [...toggleableVendorIds(next)].sort();
		const baseToggleable = [...toggleable].sort();
		const vendorsChanged =
			nextIds.length !== baseIds.length ||
			nextIds.some((id, index) => id !== baseIds[index]) ||
			nextToggleable.length !== baseToggleable.length ||
			nextToggleable.some((id, index) => id !== baseToggleable[index]);
		const material =
			fingerprint !== next.evaluationPolicy.choice.fingerprint ||
			scopeChanged ||
			vendorsChanged;
		source = next;
		if (!current.isDirty) {
			reset();
		} else if (material && !current.isStale) {
			publish({ ...current, isStale: true });
		}
	};
	return {
		acceptAll() {
			update(
				Object.fromEntries(
					current.displayedCategories.map((category) => [category, true])
				)
			);
			updateVendors(allVendorsOn());
		},
		connect() {
			sync();
			return kernel.subscribe(sync);
		},
		getSnapshot: () => current,
		rejectAll() {
			update(
				Object.fromEntries(
					current.displayedCategories.map((category) => [category, false])
				)
			);
			// Vendors follow the category: a rejected category needs no per-vendor
			// denial, and the kernel clears the denial list on a bulk action.
			updateVendors(allVendorsOn());
		},
		reset,
		async save(
			input?: SaveInput,
			categories?: readonly AllConsentNames[],
			onSuccess?: () => void
		): Promise<SaveResult> {
			// Guard against changes between the render and the click as well.
			if (
				fingerprint !==
					kernel.getSnapshot().evaluationPolicy.choice.fingerprint ||
				current.isStale
			) {
				publish({ ...current, isStale: true });
				return { ok: false };
			}
			const patch: Partial<ConsentState> = {};
			const selection = new Set(categories ?? current.displayedCategories);
			for (const category of current.displayedCategories) {
				if (category !== 'necessary' && selection.has(category)) {
					patch[category] = current.values[category];
				}
			}
			saveSequence += 1;
			const sequence = saveSequence;
			// Only vendors the draft moved travel with the save, so an untouched
			// vendor never renews the recorded confirmation time. A bulk action
			// clears the denial list on its own, so it carries none.
			const bulk = input === 'all' || input === 'none';
			const vendors: Record<string, boolean> = {};
			if (!bulk) {
				for (const [id, granted] of Object.entries(current.vendors)) {
					if (baseVendors[id] !== granted) {
						setOwn(vendors, id, granted);
					}
				}
			}
			const pending = kernel.commands.save(input ?? patch, {
				categories,
				...(Object.keys(vendors).length > 0 && { vendors }),
			});
			// A clean draft can reseed synchronously from the local receipt.
			const savedRevision = revision;
			const result = await pending;
			if (
				result.ok &&
				sequence === saveSequence &&
				revision === savedRevision &&
				!current.isStale &&
				fingerprint === kernel.getSnapshot().evaluationPolicy.choice.fingerprint
			) {
				reset();
				onSuccess?.();
			}
			return result;
		},
		set(category: AllConsentNames, value: boolean) {
			update({ [category]: value });
		},
		setVendor(vendorId: string, granted: boolean) {
			updateVendors({ [vendorId]: granted });
		},
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		update,
	};
};
type DraftStore = ReturnType<typeof createDraftStore>;
const DraftContext = createContext<DraftStore | null>(null);
const useKernel = function useKernel() {
	const kernel = useContext(KernelContext);
	if (!kernel) {
		throw new Error('Consent drafts require a ConsentProvider.');
	}
	return kernel;
};
export interface ConsentDraftProviderProps {
	children: ReactNode;
	/** Defaults apply only to categories without an explicit receipt. */
	initial?: Partial<ConsentState>;
}
export const ConsentDraftProvider = ({
	children,
	initial,
}: ConsentDraftProviderProps) => {
	const kernel = useKernel();
	const parent = useContext(DraftContext);
	const { presentation } = useUIConfig();
	const [local, setLocal] = useState(() =>
		createDraftStore(kernel, initial ?? presentation?.preferences?.defaults)
	);
	void setLocal;
	const store = parent && !initial ? parent : local;
	useEffect(() => store.connect(), [store]);
	return (
		<DraftContext.Provider value={store}>{children}</DraftContext.Provider>
	);
};
const useDraftStore = function useDraftStore() {
	const kernel = useKernel();
	const shared = useContext(DraftContext);
	const { presentation } = useUIConfig();
	const [local, setLocal] = useState(() =>
		createDraftStore(kernel, presentation?.preferences?.defaults)
	);
	void setLocal;
	const store = shared ?? local;
	useEffect(() => (shared ? undefined : store.connect()), [shared, store]);
	return store;
};

const useSaveAction = function useSaveAction(store: DraftStore) {
	const kernel = useKernel();
	const services = useContext(ProviderServicesContext);
	return useCallback(
		(input?: SaveInput) => {
			let current = false;
			return saveConsentUI(
				kernel,
				() =>
					store.save(input, services?.getConsentCategories(), () => {
						current = true;
					}),
				() => current
			);
		},
		[kernel, store, services]
	);
};

const useDraftHandle = function useDraftHandle(
	store: DraftStore
): ConsentDraftHandle {
	const snapshot = useSyncExternalStore(
		store.subscribe,
		store.getSnapshot,
		store.getSnapshot
	);
	return useMemo(
		() => ({
			...snapshot,
			acceptAll: store.acceptAll,
			rejectAll: store.rejectAll,
			reset: store.reset,
			save: store.save,
			set: store.set,
			setVendor: store.setVendor,
			update: store.update,
		}),
		[snapshot, store]
	);
};

/** Internal UI save path shared by stock controls and headless actions. */
export const useConsentSaveAction = function useConsentSaveAction() {
	return useSaveAction(useDraftStore());
};

/** Keep the compatibility manager selection and its save on the same draft. */
export const useConsentManagerDraft = function useConsentManagerDraft() {
	const store = useDraftStore();
	return { draft: useDraftHandle(store), save: useSaveAction(store) };
};

/** Read and edit displayed choices without replacing masked effective permissions. */
export const useConsentDraft = function useConsentDraft(): ConsentDraftHandle {
	return useDraftHandle(useDraftStore());
};
