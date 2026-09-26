import { createHostedRecordTransport } from '@c15t/core';
import type {
	HostedModeOptions,
	KernelTransport,
	ProviderTransportFactory,
} from '@c15t/core';

import type { ConsentConfig } from './config';

/** Where `ConsentRoot` resolves init and posts saves in manifest mode. */
export type ManifestModeOptions = Pick<ConsentConfig, 'backendURL'> & {
	manifestURL: string;
};

/**
 * Loads the transport that resolves init from the manifest.
 *
 * @internal
 */
export type LoadManifestTransport = (
	options: ManifestModeOptions
) => Promise<KernelTransport>;

/**
 * Loads the transport that runs init. Called at most once per successful
 * load; a rejected load is retried on the next request.
 *
 * @internal
 */
export type LoadInitTransport = () => Promise<KernelTransport>;

/**
 * Loads `@c15t/core/transports/manifest` on first use. The resolver pulls in
 * every translation language, so a static import would land in the client
 * bundle of every app that renders the root, manifest mode or not.
 */
const loadManifestTransport: LoadManifestTransport =
	async function loadManifestTransport(options) {
		const { createManifestTransport } =
			await import('@c15t/core/transports/manifest');
		return createManifestTransport(options);
	};

/**
 * A transport that loads its init path only when init runs.
 *
 * Saves, identity links, subject reads and privacy directives use the same
 * backend routes and request bodies in the hosted and manifest transports.
 * Those transports differ only after their own init remembers decision
 * inputs. When the server already resolved the visitor's state there is no
 * client init, and the kernel's decision inputs on the save payload are the
 * whole policy assertion, so those requests go out through the record
 * transport without waiting for a chunk.
 *
 * @param records - Record transport used until init starts.
 * @param load - Loads the transport that runs init.
 * @returns A kernel transport.
 * @internal
 */
export const createLazyInitTransport = function createLazyInitTransport(
	records: KernelTransport,
	load: LoadInitTransport
): KernelTransport {
	let transportPromise: Promise<KernelTransport> | undefined;
	const resolver = function resolver(): Promise<KernelTransport> {
		transportPromise ??= (async () => {
			try {
				return await load();
			} catch (error) {
				// A failed chunk load must not poison every later init/save;
				// the kernel's retry gets a fresh import attempt.
				transportPromise = undefined;
				throw error;
			}
		})();
		return transportPromise;
	};
	// Once init has started loading its transport, keep every request on it
	// so saves carry the decision inputs that init remembered.
	const recordTransport =
		async function recordTransport(): Promise<KernelTransport> {
			return transportPromise ? await resolver() : records;
		};

	return {
		async identify(user, subjectId) {
			await (await recordTransport()).identify?.(user, subjectId);
		},
		async init(ctx) {
			const transport = await resolver();
			return (await transport.init?.(ctx)) ?? {};
		},
		async loadSubjectRecord(subjectId) {
			return (
				(await (await recordTransport()).loadSubjectRecord?.(subjectId)) ?? null
			);
		},
		async recordPrivacyOptOut(directive, subjectId) {
			await (
				await recordTransport()
			).recordPrivacyOptOut?.(directive, subjectId);
		},
		async save(payload) {
			const transport = await recordTransport();
			if (!transport.save) {
				throw new Error('@c15t/nextjs: the init transport cannot save.');
			}
			return await transport.save(payload);
		},
	};
};

/**
 * Manifest transport for `ConsentRoot` that loads the resolver only when
 * the browser has to resolve init itself.
 *
 * @param options - Backend and manifest URLs.
 * @param load - Loads the resolving transport. Defaults to a dynamic import.
 * @returns A kernel transport.
 * @internal
 */
export const createLazyManifestTransport = function createLazyManifestTransport(
	options: ManifestModeOptions,
	load: LoadManifestTransport = loadManifestTransport
): KernelTransport {
	return createLazyInitTransport(
		createHostedRecordTransport({ backendURL: options.backendURL }),
		() => load(options)
	);
};

/**
 * Loads the full hosted transport, whose init path (request-context headers,
 * the inline-prefetch reader and the init-response mapper) a server-resolved
 * root never runs.
 */
const loadHostedTransport = async function loadHostedTransport(
	options: HostedModeOptions
): Promise<KernelTransport> {
	const { createHostedTransport } = await import('./hosted-mode');
	return createHostedTransport({
		assertDecisionInputs: options.assertDecisionInputs,
		backendURL: options.url,
		fetch: options.fetch,
		initURL: options.initURL,
	});
};

/**
 * Hosted mode for `ConsentRoot`. Saves and the other record requests go
 * out at once through the record transport; the init path loads on the
 * first init, which a root with server-resolved state only runs when the
 * provider re-initializes.
 *
 * With `assertDecisionInputs`, a save that carries no decision inputs of its
 * own is refused until init resolved a decision, as in the full transport.
 * Both halves use the `fetch` that was global when the transport was
 * created, as the full transport does.
 *
 * @param options - Backend URL and, for same-origin init, `initURL` with
 *   `assertDecisionInputs`.
 * @param load - Loads the full hosted transport. Defaults to a dynamic import.
 * @returns A provider transport factory reporting `kind: 'hosted'`.
 * @internal
 */
export const lazyHosted = function lazyHosted(
	options: Pick<HostedModeOptions, 'assertDecisionInputs' | 'initURL' | 'url'>,
	load: (
		options: HostedModeOptions
	) => Promise<KernelTransport> = loadHostedTransport
): ProviderTransportFactory {
	return Object.assign(
		(): KernelTransport => {
			const fetch = globalThis.fetch?.bind(globalThis);
			return createLazyInitTransport(
				createHostedRecordTransport(
					{ backendURL: options.url, fetch },
					options.assertDecisionInputs
						? {
								inputs: () => undefined,
								pending: () => undefined,
								required: true,
							}
						: undefined
				),
				() => load({ ...options, fetch })
			);
		},
		{ kind: 'hosted' as const }
	);
};
