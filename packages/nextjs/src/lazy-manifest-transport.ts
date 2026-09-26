import { createHostedTransport } from '@c15t/core';
import type { KernelTransport } from '@c15t/core';

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
 * Manifest transport for `ConsentRoot` that loads the resolver only when
 * the browser has to resolve init itself.
 *
 * Saves, identity links, subject reads and privacy directives use the same
 * backend routes and request bodies in the hosted and manifest transports.
 * The manifest transport differs only after its own init remembers decision
 * inputs. When the server already resolved the visitor's state there is no
 * client init, and the kernel's decision inputs on the save payload are the
 * whole policy assertion, so those requests go out without waiting for the
 * resolver chunk.
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
	let transportPromise: Promise<KernelTransport> | undefined;
	const resolver = function resolver(): Promise<KernelTransport> {
		transportPromise ??= (async () => {
			try {
				return await load(options);
			} catch (error) {
				// A failed chunk load must not poison every later init/save;
				// the kernel's retry gets a fresh import attempt.
				transportPromise = undefined;
				throw error;
			}
		})();
		return transportPromise;
	};
	const records = createHostedTransport({ backendURL: options.backendURL });
	// Once init has started loading the resolver, keep every request on it so
	// saves carry the decision inputs that init remembered.
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
				throw new Error('@c15t/nextjs: manifest transport cannot save.');
			}
			return await transport.save(payload);
		},
	};
};
