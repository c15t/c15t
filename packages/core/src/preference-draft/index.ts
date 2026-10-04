/**
 * The preference draft: the visitor's unsaved choices in a preference
 * surface, kept apart from the recorded consent until an explicit save.
 *
 * One module for every framework. It owns seeding from the record and the
 * policy, staging category and vendor edits, the dirty and stale flags, the
 * categories a surface displays, the save input, and following the record
 * after a save. Framework adapters wrap it in their own reactivity; none of
 * them re-implements a rule.
 *
 * Rules, each pinned by a test at this interface:
 *
 * - **Delta over the record.** Only moved values are staged. A newer record
 *   (another surface or tab saved, or this draft's own save landed) moves
 *   every untouched value, and a staged value the record now holds is no
 *   longer an edit. New presentation defaults wait until the draft is
 *   clean: they are not a record, and a dirty draft must not save a
 *   default the visitor never saw.
 * - **Stale.** A dirty draft whose policy fingerprint, displayed categories
 *   or vendor surface changed since the visitor last saw a clean draft is
 *   stale. Saving it records nothing and resolves `{ ok: false }`; `reset()`
 *   reviews it. A clean draft follows the kernel and is never stale.
 * - **Displayed categories** are `necessary` plus the policy's choice scope,
 *   in the policy's order: what the kernel lets the visitor decide.
 * - **Vendor surface** is the set of vendor rows (id, `disabled`, category),
 *   independent of declaration order.
 * - **Bulk actions** (`'all'`, `'none'`) record under the current policy
 *   whether or not the draft is stale, and discard every staged edit.
 *
 * Load this module behind a surface's lazy boundary: it is only needed once
 * a preference surface opens.
 *
 * @packageDocumentation
 */
import type { AllConsentNames } from '../consent/consent-types';
import { vendorRenders } from '../libs/vendors';
import { deniedVendorIds } from '../modules/has';
import type {
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	SaveResult,
	SaveUISource,
	Unsubscribe,
} from '../types';

/** Granted flag per vendor id. */
type Grants = Record<string, boolean>;

/** What a preference surface renders from. Replaced, never mutated. */
export interface PreferenceDraftState {
	/**
	 * The value each category shows: a staged edit, else the recorded
	 * choice, else the presentation default, else the policy default.
	 * `necessary` is always `true`; a category outside the displayed ones is
	 * `false`.
	 */
	readonly values: Readonly<ConsentState>;
	/** `necessary` plus the categories the policy lets the visitor decide. */
	readonly displayedCategories: readonly AllConsentNames[];
	/**
	 * Granted flag per declared vendor: a staged edit, else the record. A
	 * vendor declared `disabled` reads `true` whatever an older record says.
	 * Empty under an `iab` policy, where the TC string decides.
	 */
	readonly vendors: Readonly<Grants>;
	/** Whether any staged value differs from the record. */
	readonly isDirty: boolean;
	/** Whether the policy or the vendor rows changed under a staged edit. */
	readonly isStale: boolean;
}

/** Input for {@link PreferenceDraft.save}. */
export interface PreferenceDraftSaveOptions {
	/**
	 * Record a bulk choice instead of the draft's values. Discards every
	 * staged edit, and records even when the draft is stale.
	 */
	input?: 'all' | 'none';
	/** Narrow the save to these displayed categories. */
	categories?: readonly AllConsentNames[];
	/** Surface to attribute the save to. */
	uiSource?: SaveUISource;
}

/** The categories and moved vendors a save of the draft records. */
export type PreferenceDraftSaveInput = Partial<ConsentState> & {
	vendors?: Grants;
};

/** A preference draft bound to one kernel. */
export interface PreferenceDraft {
	/** The kernel this draft reads from and saves into. */
	readonly kernel: ConsentKernel;
	/**
	 * The current state. Returns the same object until something the
	 * surface shows changes, so it can back `useSyncExternalStore`.
	 */
	getState: () => PreferenceDraftState;
	/**
	 * Call `listener` when {@link getState} changes. The draft follows the
	 * kernel while it has a listener.
	 *
	 * @returns Unsubscribe.
	 */
	subscribe: (listener: () => void) => Unsubscribe;
	/** Stage one category. `necessary` and undisplayed categories are ignored. */
	set: (category: AllConsentNames, value: boolean) => void;
	/** Stage several categories. See {@link set}. */
	update: (patch: Partial<ConsentState>) => void;
	/**
	 * Stage one vendor's grant. Ignored for a vendor that is not declared or
	 * is declared `disabled`, and under an `iab` policy.
	 */
	setVendor: (vendorId: string, granted: boolean) => void;
	/** Stage every displayed category and every vendor on. */
	acceptAll: () => void;
	/**
	 * Stage every displayed category off. Vendors stay on: a denied
	 * category needs no per-vendor denial.
	 */
	rejectAll: () => void;
	/** Drop every staged edit and show the record. */
	reset: () => void;
	/**
	 * Replace the presentation defaults a category without a recorded choice
	 * shows. A clean draft shows them at once; a dirty one keeps the
	 * defaults the visitor saw until it is saved or reset.
	 */
	setDefaults: (defaults: Partial<ConsentState> | undefined) => void;
	/**
	 * What saving the draft records: every displayed category (narrowed to
	 * `categories`) and only the vendors the visitor moved, so an untouched
	 * vendor never renews its confirmation time.
	 *
	 * @returns The save input, or `null` while the draft is stale.
	 */
	toSaveInput: (
		categories?: readonly AllConsentNames[]
	) => PreferenceDraftSaveInput | null;
	/**
	 * Record the draft, or a bulk choice, through `kernel.commands.save`.
	 * The record commits before this returns its promise, and the draft
	 * follows it: values the save recorded stop being edits, and edits made
	 * while the request runs stay staged.
	 *
	 * @returns The kernel's result, or `{ ok: false }` without recording
	 * when the draft is stale and `input` is not a bulk choice.
	 */
	save: (options?: PreferenceDraftSaveOptions) => Promise<SaveResult>;
}

/** Options for {@link createPreferenceDraft}. */
export interface PreferenceDraftOptions {
	/** Presentation defaults for categories without a recorded choice. */
	defaults?: Partial<ConsentState>;
}

/**
 * Defines an own enumerable property. Plain assignment would route a valid
 * `__proto__` vendor id through the prototype setter and drop it.
 */
const setOwn = function setOwn(
	target: Grants,
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

const sameGrants = function sameGrants(
	left: Readonly<Grants>,
	right: Readonly<Grants>
): boolean {
	const keys = Object.keys(left);
	return (
		keys.length === Object.keys(right).length &&
		keys.every((key) => Object.hasOwn(right, key) && left[key] === right[key])
	);
};

const sameDefaults = function sameDefaults(
	left: Partial<ConsentState> | undefined,
	right: Partial<ConsentState> | undefined
): boolean {
	return (
		left === right ||
		(left !== undefined &&
			right !== undefined &&
			sameGrants(left as Grants, right as Grants))
	);
};

/** Ids a save may change: declared and not `disabled`, mirroring the kernel. */
const toggleableIds = function toggleableIds(
	snapshot: ConsentSnapshot
): ReadonlySet<string> {
	const ids = new Set<string>();
	if (snapshot.model !== 'iab') {
		for (const vendor of snapshot.vendors?.declared ?? []) {
			if (vendor.disabled !== true) {
				ids.add(vendor.id);
			}
		}
	}
	return ids;
};

/**
 * The vendor rows a surface shows, as text: id, `disabled` and category of
 * every declaration that can produce a row, sorted by id. A script that
 * registers only its slug, a vendor under a negated condition, or a new
 * declaration order changes nothing the visitor sees.
 */
const vendorSurface = function vendorSurface(
	snapshot: ConsentSnapshot
): string {
	if (snapshot.model === 'iab') {
		return '';
	}
	return JSON.stringify(
		(snapshot.vendors?.declared ?? [])
			.filter(vendorRenders)
			.map((vendor) => [vendor.id, vendor.disabled === true, vendor.category])
			.sort(([left], [right]) => String(left).localeCompare(String(right)))
	);
};

/**
 * What a category shows before the visitor moves it: the recorded choice,
 * else the presentation default, else the policy default. `necessary` is
 * always on and a category outside the choice scope is off.
 */
const recordedValues = function recordedValues(
	snapshot: ConsentSnapshot,
	scope: readonly AllConsentNames[],
	defaults: Partial<ConsentState> | undefined
): ConsentState {
	const rule = snapshot.policyRule;
	const recorded = snapshot.explicitChoice?.categories;
	const values: ConsentState = {
		experience: false,
		functionality: false,
		marketing: false,
		measurement: false,
		necessary: true,
	};
	for (const category of scope) {
		if (category !== 'necessary') {
			values[category] =
				recorded?.[category]?.value ??
				defaults?.[category] ??
				(rule.model === 'opt-out' ||
					rule.preselectedCategories.includes(category));
		}
	}
	return values;
};

/**
 * Granted flag per declared vendor from the denials the gate honors, so a
 * stale denial for a vendor now declared `disabled` does not count.
 */
const recordedVendors = function recordedVendors(
	snapshot: ConsentSnapshot
): Grants {
	const grants: Grants = {};
	if (snapshot.model !== 'iab') {
		const denied = deniedVendorIds(snapshot);
		for (const vendor of snapshot.vendors?.declared ?? []) {
			setOwn(grants, vendor.id, !denied?.has(vendor.id));
		}
	}
	return grants;
};

/** `value` over `base` for every staged key `include` accepts. */
const overlay = function overlay<KeyType extends string>(
	base: Readonly<Record<KeyType, boolean>>,
	staged: ReadonlyMap<KeyType, boolean>,
	include: (key: KeyType) => boolean
): Record<KeyType, boolean> {
	const next = { ...base };
	for (const [key, value] of staged) {
		if (include(key)) {
			setOwn(next as Grants, key, value);
		}
	}
	return next;
};

/** Drop staged entries the record now holds. */
const prune = function prune<KeyType extends string>(
	staged: Map<KeyType, boolean>,
	recorded: Readonly<Record<string, boolean>>
): void {
	for (const [key, value] of staged) {
		if (recorded[key] === value) {
			staged.delete(key);
		}
	}
};

/**
 * `next`, keeping `previous` or any part of it that did not change, so a
 * selector over one slice does not re-render on an edit elsewhere.
 */
const share = function share(
	previous: PreferenceDraftState,
	next: PreferenceDraftState
): PreferenceDraftState {
	const displayedCategories =
		previous.displayedCategories.join(',') ===
		next.displayedCategories.join(',')
			? previous.displayedCategories
			: next.displayedCategories;
	const values = sameGrants(previous.values, next.values)
		? previous.values
		: next.values;
	const vendors = sameGrants(previous.vendors, next.vendors)
		? previous.vendors
		: next.vendors;
	if (
		displayedCategories === previous.displayedCategories &&
		values === previous.values &&
		vendors === previous.vendors &&
		next.isDirty === previous.isDirty &&
		next.isStale === previous.isStale
	) {
		return previous;
	}
	return { ...next, displayedCategories, values, vendors };
};

/**
 * Create a preference draft over a kernel. Nothing is recorded until
 * {@link PreferenceDraft.save}.
 *
 * @param kernel - The kernel to read the record from and save into.
 * @param options - Presentation defaults.
 * @returns The draft.
 * @example
 * ```ts
 * import { createPreferenceDraft } from '@c15t/core/preference-draft';
 *
 * const draft = createPreferenceDraft(runtime.kernel);
 * const stop = draft.subscribe(() => render(draft.getState()));
 * draft.set('marketing', false);
 * await draft.save();
 * stop();
 * ```
 * @public
 */
// oxlint-disable-next-line max-lines-per-function -- One closure keeps the staged edits private.
export const createPreferenceDraft = function createPreferenceDraft(
	kernel: ConsentKernel,
	options: PreferenceDraftOptions = {}
): PreferenceDraft {
	let { defaults } = options;
	/**
	 * The defaults the visitor is looking at. New defaults (an experiment
	 * arm assigned after mount) wait until nothing is staged, so a switch
	 * the visitor left alone never flips under an edit and saves a grant
	 * they did not see.
	 */
	let shownDefaults = defaults;
	/** Staged categories, each different from the record. */
	const staged = new Map<AllConsentNames, boolean>();
	/** Staged vendors, each different from the record. */
	const stagedVendors = new Map<string, boolean>();
	/** Bumped by every edit, so an older bulk save cannot drop a newer one. */
	let edits = 0;
	/** What the visitor last saw while nothing was staged. */
	let seen = '';
	let derivedFrom: ConsentSnapshot | null = null;
	let baseline = {} as ConsentState;
	let seeded: Grants = {};
	let toggleable: ReadonlySet<string> = new Set();
	const listeners = new Set<() => void>();
	let stopFollowing: Unsubscribe | null = null;

	const derive = function derive(
		previous: PreferenceDraftState | null
	): PreferenceDraftState {
		const snapshot = kernel.getSnapshot();
		derivedFrom = snapshot;
		const scope =
			snapshot.evaluationPolicy.choiceScope ?? snapshot.policyRule.scope;
		const displayedCategories: AllConsentNames[] = ['necessary', ...scope];
		const isClean = () => staged.size === 0 && stagedVendors.size === 0;
		if (isClean()) {
			shownDefaults = defaults;
		}
		baseline = recordedValues(snapshot, scope, shownDefaults);
		seeded = recordedVendors(snapshot);
		toggleable = toggleableIds(snapshot);
		// A staged value the record now holds is no longer an edit.
		prune(staged, baseline);
		prune(stagedVendors, seeded);
		if (isClean() && shownDefaults !== defaults) {
			shownDefaults = defaults;
			baseline = recordedValues(snapshot, scope, shownDefaults);
		}
		const isDirty = !isClean();
		const review = [
			snapshot.evaluationPolicy.choice.fingerprint,
			displayedCategories.join(','),
			vendorSurface(snapshot),
		].join('|');
		if (!isDirty) {
			seen = review;
		}
		const next: PreferenceDraftState = {
			displayedCategories,
			isDirty,
			isStale: isDirty && seen !== review,
			values: overlay(baseline, staged, (category) =>
				displayedCategories.includes(category)
			),
			vendors: overlay(seeded, stagedVendors, (id) => toggleable.has(id)),
		};
		return previous ? share(previous, next) : next;
	};

	let state = derive(null);

	/** Re-derive from the kernel and tell listeners when the state changed. */
	const refresh = function refresh(): PreferenceDraftState {
		const next = derive(state);
		if (next !== state) {
			state = next;
			for (const listener of [...listeners]) {
				listener();
			}
		}
		return state;
	};

	const current = function current(): PreferenceDraftState {
		return derivedFrom === kernel.getSnapshot() ? state : refresh();
	};

	/** Stage `value` over `recorded`, or unstage it when they match. */
	const stage = function stage<KeyType>(
		target: Map<KeyType, boolean>,
		key: KeyType,
		value: boolean,
		recorded: boolean | undefined
	): boolean {
		if (value === recorded) {
			return target.delete(key);
		}
		if (target.get(key) === value) {
			return false;
		}
		target.set(key, value);
		return true;
	};

	const changed = function changed(any: boolean): void {
		if (any) {
			edits += 1;
			refresh();
		}
	};

	const update = function update(patch: Partial<ConsentState>): void {
		// Anchor the review on what is current before the first edit lands.
		const { displayedCategories } = current();
		let any = false;
		for (const category of displayedCategories) {
			const value = patch[category];
			if (category !== 'necessary' && typeof value === 'boolean') {
				any = stage(staged, category, value, baseline[category]) || any;
			}
		}
		changed(any);
	};

	const updateVendors = function updateVendors(patch: Readonly<Grants>): void {
		current();
		let any = false;
		for (const [id, granted] of Object.entries(patch)) {
			if (toggleable.has(id) && typeof granted === 'boolean') {
				any = stage(stagedVendors, id, granted, seeded[id]) || any;
			}
		}
		changed(any);
	};

	/** Stage every displayed category; every vendor follows on. */
	const stageAll = function stageAll(value: boolean): void {
		const { displayedCategories } = current();
		update(
			Object.fromEntries(
				displayedCategories.map((category) => [category, value])
			)
		);
		const grants: Grants = {};
		for (const id of toggleable) {
			setOwn(grants, id, true);
		}
		updateVendors(grants);
	};

	const reset = function reset(): void {
		edits += 1;
		staged.clear();
		stagedVendors.clear();
		refresh();
	};

	const toSaveInput = function toSaveInput(
		categories?: readonly AllConsentNames[]
	): PreferenceDraftSaveInput | null {
		const { displayedCategories, isStale, values } = current();
		if (isStale) {
			return null;
		}
		const input: PreferenceDraftSaveInput = {};
		for (const category of displayedCategories) {
			if (
				category !== 'necessary' &&
				(categories === undefined || categories.includes(category))
			) {
				input[category] = values[category];
			}
		}
		const moved: Grants = {};
		for (const [id, granted] of stagedVendors) {
			if (toggleable.has(id)) {
				setOwn(moved, id, granted);
			}
		}
		if (Object.keys(moved).length > 0) {
			input.vendors = moved;
		}
		return input;
	};

	return {
		acceptAll() {
			stageAll(true);
		},
		getState: current,
		kernel,
		rejectAll() {
			stageAll(false);
		},
		reset,
		async save(saveOptions = {}) {
			const { categories, input, uiSource } = saveOptions;
			const context = {
				...(categories !== undefined && { categories }),
				...(uiSource !== undefined && { uiSource }),
			};
			if (input === 'all' || input === 'none') {
				const before = kernel.getSnapshot();
				const editsAtSave = edits;
				const pending = kernel.commands.save(input, context);
				const after = kernel.getSnapshot();
				// The bulk choice supersedes every staged edit once it is
				// recorded; one that recorded nothing new resets on success.
				if (
					after.explicitChoice !== before.explicitChoice ||
					after.vendorChoice !== before.vendorChoice
				) {
					reset();
					return pending;
				}
				const result = await pending;
				if (result.ok && edits === editsAtSave) {
					reset();
				}
				return result;
			}
			const draftInput = toSaveInput(categories);
			if (!draftInput) {
				return { ok: false };
			}
			const pending = kernel.commands.save(draftInput, context);
			// The record committed before the request: what it holds now stops
			// being an edit, for a draft nobody subscribes to as well.
			refresh();
			return pending;
		},
		set(category, value) {
			update({ [category]: value });
		},
		setDefaults(next) {
			if (!sameDefaults(defaults, next)) {
				defaults = next;
				refresh();
			}
		},
		setVendor(vendorId, granted) {
			updateVendors({ [vendorId]: granted });
		},
		subscribe(listener) {
			// Catch up with a kernel change that landed while nobody listened.
			current();
			listeners.add(listener);
			stopFollowing ??= kernel.subscribe(() => {
				refresh();
			});
			return () => {
				listeners.delete(listener);
				if (listeners.size === 0 && stopFollowing) {
					stopFollowing();
					stopFollowing = null;
				}
			};
		},
		toSaveInput,
		update,
	};
};
