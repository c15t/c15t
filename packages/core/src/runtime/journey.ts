/**
 * The browser runtime's consent journey: which id this page load's requests
 * carry, and, for `journey: 'tab'`, when it lives in `sessionStorage`.
 *
 * The journey is created on the runtime's first `start()`, after stored
 * consent is hydrated, so it knows whether the visitor already had a
 * choice. It continues a journey a server render started (its id arrives in
 * the prefetch), one a request sent before the runtime started (React's
 * early `/init`, the inline prefetch script) recorded for this page, or,
 * with `'tab'`, one an earlier page in the same tab left in
 * `sessionStorage`. It reaches the backend through the transport the
 * runtime builds: {@link withJourney} adds it to every `init` context and to
 * every save this page sends live. A queued save is never stored with it,
 * and a replay carries none.
 *
 * `'tab'` writes the id only while a prompt is due (no stored choice and a
 * first layer showing) and removes it once a choice or a notice dismissal
 * is recorded, or once the resolved state owes no prompt (a failed
 * resolution, or a policy that prompts for nothing). Any storage error makes the journey a `'page'` one.
 */

import { parseJourneyId } from '@c15t/schema/types';

import {
	openJourney,
	readEarlyJourney,
	sessionStorageOf,
} from '../libs/journey';
import type { ConsentJourneyOption, JourneyStorage } from '../libs/journey';
import { JOURNEY_STORAGE_KEY } from '../libs/storage-keys';
import type {
	ConsentKernel,
	ConsentSnapshot,
	KernelJourney,
	KernelTransport,
	SavePayload,
} from '../types';

export type { JourneyStorage } from '../libs/journey';

/** Options for {@link createJourneyController}. */
export interface JourneyControllerOptions {
	/** The runtime's `journey` option. */
	option: ConsentJourneyOption | undefined;
	/** The journey id a server render handed over, if any. */
	serverId?: string;
	/**
	 * Where a `'tab'` journey is kept. Defaults to `window.sessionStorage`.
	 * Throwing, or returning `null`, makes the journey a `'page'` one.
	 */
	storage?: () => JourneyStorage | null;
}

/** A runtime's journey. @internal */
export interface JourneyController {
	/**
	 * Create the journey on the first call, then (for `'tab'`) keep
	 * `sessionStorage` in step with the kernel until the returned cleanup
	 * runs. Later calls resume the same journey.
	 */
	start: (kernel: ConsentKernel) => () => void;
	/**
	 * Continue the journey a server state started, when that state arrives
	 * after construction (a streamed prefetch). Ignored once a save carried
	 * the current id, and for a `'tab'` journey an earlier page started.
	 */
	adopt: (id: string | undefined) => void;
	/** The journey an `init` carries, or `undefined` for none. */
	forInit: () => KernelJourney | undefined;
	/** The journey a save carries, or `undefined` for none. */
	forSave: () => SavePayload['journey'];
}

/**
 * Create the journey controller of one runtime. Pure: nothing is read or
 * written before `start()`.
 *
 * @param options - The `journey` option, the server's id and the storage.
 * @returns The controller.
 * @internal
 */
export const createJourneyController = function createJourneyController(
	options: JourneyControllerOptions
): JourneyController {
	const storage = options.storage ?? sessionStorageOf;
	let serverId = parseJourneyId(options.serverId);
	let journey: KernelJourney | undefined;
	// The id came from an earlier page of this tab: it outranks a server's.
	let continued = false;
	// A save carried the id, so it can no longer change.
	let sent = false;
	// The id is in `sessionStorage` as far as this runtime knows.
	let stored = false;

	const asPage = function asPage(): void {
		if (journey && journey.scope !== 'page') {
			journey = Object.freeze({ ...journey, scope: 'page' as const });
		}
	};

	const create = function create(kernel: ConsentKernel): void {
		// A server render's id first, then one an early request of this page
		// already sent (React's early `/init`, the inline prefetch script).
		const opened = openJourney({
			adopted: serverId ?? readEarlyJourney()?.id,
			option: options.option,
			storage,
			storedChoice: kernel.getSnapshot().explicitChoice !== null,
		});
		if (!opened) {
			return;
		}
		({ journey, continued } = opened);
		stored = continued;
	};

	const write = function write(): void {
		if (!journey || stored) {
			return;
		}
		try {
			const store = storage();
			if (!store) {
				asPage();
				return;
			}
			store.setItem(JOURNEY_STORAGE_KEY, journey.id);
			stored = true;
		} catch {
			asPage();
		}
	};

	const remove = function remove(): void {
		if (!stored) {
			return;
		}
		stored = false;
		try {
			storage()?.removeItem(JOURNEY_STORAGE_KEY);
		} catch {
			// The id outlives this page in a storage that rejects writes;
			// nothing else reads it.
		}
	};

	/**
	 * The resolved state shows no first layer: the resolution failed, or it
	 * settled on a policy that prompts for nothing. An id an earlier page left
	 * would otherwise stay in `sessionStorage` and join unrelated page loads.
	 */
	const owesNoPrompt = function owesNoPrompt(
		snapshot: ConsentSnapshot
	): boolean {
		if (snapshot.activeUI !== 'none') {
			return false;
		}
		if (snapshot.resolution.status === 'failed') {
			return true;
		}
		return (
			!snapshot.policyPending &&
			!snapshot.experimentPending &&
			snapshot.promptRequirement.kind === 'none'
		);
	};

	const watch = function watch(kernel: ConsentKernel): () => void {
		const sync = function sync(): void {
			if (journey?.scope !== 'tab') {
				return;
			}
			const snapshot = kernel.getSnapshot();
			if (snapshot.explicitChoice !== null || owesNoPrompt(snapshot)) {
				remove();
			} else if (snapshot.activeUI !== 'none') {
				write();
			}
		};
		const unsubscribers = [
			kernel.subscribe(sync),
			kernel.events.on('choice:recorded', remove),
			kernel.events.on('notice:dismissed', remove),
		];
		sync();
		return function stopWatching() {
			for (const unsubscribe of unsubscribers) {
				unsubscribe();
			}
		};
	};

	return {
		adopt(id) {
			const parsed = parseJourneyId(id);
			if (!parsed || continued || sent) {
				return;
			}
			if (!journey) {
				serverId = parsed;
				return;
			}
			if (parsed === journey.id) {
				return;
			}
			journey = Object.freeze({ ...journey, id: parsed });
			if (stored) {
				stored = false;
				write();
			}
		},
		forInit: () => journey,
		forSave() {
			if (!journey) {
				return undefined;
			}
			sent = true;
			return { id: journey.id, scope: journey.scope };
		},
		start(kernel) {
			if (!journey) {
				create(kernel);
			}
			return journey?.scope === 'tab' ? watch(kernel) : () => undefined;
		},
	};
};

/**
 * Wrap a transport so each `init` context carries the journey and each save
 * carries it as it leaves. Methods are read from `transport` on every call,
 * so a host that swaps one in place (React's early `/init`) still reaches
 * the swapped method. Methods the transport lacks stay absent.
 *
 * @param transport - The transport the runtime's `mode` built.
 * @param journey - The runtime's journey.
 * @returns The wrapped transport.
 * @internal
 */
export const withJourney = function withJourney(
	transport: KernelTransport,
	journey: Pick<JourneyController, 'forInit' | 'forSave'>
): KernelTransport {
	const wrapped: KernelTransport = {};
	if (transport.init) {
		wrapped.init = (ctx) => {
			const current = journey.forInit();
			return (transport.init as NonNullable<KernelTransport['init']>)(
				current ? { ...ctx, journey: current } : ctx
			);
		};
	}
	if (transport.save) {
		wrapped.save = (payload, context) => {
			// Only the page that made a save sends it with its journey.
			const save = transport.save as NonNullable<KernelTransport['save']>;
			if (context?.replay) {
				return save(payload, context);
			}
			const current = journey.forSave();
			return save(current ? { ...payload, journey: current } : payload);
		};
	}
	if (transport.identify) {
		wrapped.identify = (user, subjectId) =>
			(transport.identify as NonNullable<KernelTransport['identify']>)(
				user,
				subjectId
			);
	}
	if (transport.loadSubjectRecord) {
		wrapped.loadSubjectRecord = (subjectId) =>
			(
				transport.loadSubjectRecord as NonNullable<
					KernelTransport['loadSubjectRecord']
				>
			)(subjectId);
	}
	return wrapped;
};
