/**
 * Whether a provider runtime's script loader will run a script as soon as
 * the runtime starts, judged before it starts.
 *
 * A framework provider builds its runtime during its first render and
 * starts it from a mount effect, once the whole tree has rendered. A
 * script loader that loads on demand requests its chunk only then. When
 * the visitor's consent already lets a script run, the provider can start
 * that request from its first render instead, so the chunk loads while the
 * rest of the page renders.
 *
 * The judgement reads the runtime's own kernel, so its categories, vendors,
 * overrides, disabled policy and external consent source are the ones
 * `start()` uses. What `start()` adds to that kernel is applied here with
 * the kernel's own code, on a copy of its snapshot:
 *
 * - a streamed prefetch, through the fold `init()` applies it with;
 * - the stored records, through the read persistence reconciles with. A
 *   stored denial counts whatever its age, and a stored grant never does,
 *   so the copy is never more permissive than the kernel after `start()`;
 * - the browser's Global Privacy Control signal, which only restricts.
 *
 * Each script then goes through the loader's own test: `alwaysLoad`, or
 * consent for its category and vendor.
 */
import { detectBrowserGpc, foldInitResponse } from '../kernel/init-lifecycle';
import { buildNextSnapshot } from '../kernel/patch';
import { evaluateConsent } from '../modules/has';
import { readStoredRecordsForReconcile } from '../modules/persistence/hydrate';
import { kernelConfigToInitResponse } from '../transports/init-output';
import type { ConsentKernel } from '../types';
import { readsRecords, readsStoredRecords, storageFor } from './assemble';
import type { ConsentRuntimeOptions, RuntimePrefetch } from './types';

/**
 * Whether the script loader, mounted by `start()` now, would run one of
 * `options.scripts` straight away.
 *
 * Errs towards `false`: a stored denial counts even when a newer grant
 * overrides it, a prefetch without a policy grants nothing, and anything
 * that throws reads as no.
 *
 * @param kernel - The runtime's kernel, before `start()`.
 * @param options - The runtime's options.
 * @param streamed - What a streamed prefetch resolved to, once it has.
 * @returns `true` when a script would mount once the loader loads.
 * @internal
 */
// oxlint-disable-next-line complexity -- One pass in the order start() applies them keeps the inputs visible.
export const scriptLoaderRunsAtStart = function scriptLoaderRunsAtStart(
	kernel: ConsentKernel,
	options: ConsentRuntimeOptions,
	streamed?: RuntimePrefetch
): boolean {
	try {
		const now = Date.now();
		let snapshot = kernel.getSnapshot();
		if (readsRecords(options)) {
			const response =
				streamed && kernelConfigToInitResponse(streamed, options.overrides);
			// Without a policy, `init()` asks the backend for one: nothing is
			// granted until then.
			if (response) {
				snapshot = buildNextSnapshot(
					snapshot,
					foldInitResponse(snapshot, response, now).patch
				);
			}
			const { choice, vendorChoice } = readsStoredRecords(options)
				? readStoredRecordsForReconcile(storageFor(options), now).records
				: {};
			const categories = { ...snapshot.explicitChoice?.categories };
			for (const [category, decision] of Object.entries(
				choice?.categories ?? {}
			)) {
				if (decision?.value === false) {
					categories[category as keyof typeof categories] = decision;
				}
			}
			const denied = [
				...(snapshot.vendorChoice?.denied ?? []),
				...(vendorChoice?.denied ?? []),
			];
			snapshot = buildNextSnapshot(snapshot, {
				explicitChoice:
					choice || snapshot.explicitChoice
						? { categories, version: 3 }
						: undefined,
				now,
				privacyDetected:
					snapshot.privacySignals.gpc.detected || detectBrowserGpc(),
				vendorChoice: denied.length
					? { confirmedAt: now, denied, version: 1 }
					: undefined,
			});
		}
		// The loader's own test: `alwaysLoad`, or consent for the script's
		// category and vendor.
		return (options.scripts ?? []).some(
			(script) =>
				script.alwaysLoad === true || evaluateConsent(script, snapshot, now)
		);
	} catch {
		return false;
	}
};
