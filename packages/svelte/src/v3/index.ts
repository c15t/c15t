/**
 * @c15t/svelte/v3 — Svelte adapter over the shared v3 kernel.
 *
 * No Svelte-specific consent model lives here. Stores subscribe directly to
 * the framework-neutral kernel snapshot and selectors dispose cleanly.
 */
import {
	type ConsentKernel,
	type ConsentSnapshot,
	type ConsentState,
	createConsentKernel,
	createHostedTransport,
	createOfflineTransport,
	type HostedTransportOptions,
	type KernelConfig,
	type KernelTransport,
} from 'c15t/v3';
import { getContext, setContext } from 'svelte';
import { derived, type Readable, readable } from 'svelte/store';

const kernelContextKey = Symbol('c15t-svelte-v3-kernel');
type ConsentCategory = keyof ConsentState & string;

export interface SvelteConsentOptions extends KernelConfig {
	mode?: 'hosted' | 'offline';
	backendURL?: string;
	domain?: string;
	headers?: HostedTransportOptions['headers'];
	fetch?: HostedTransportOptions['fetch'];
	transport?: KernelTransport;
}

export interface SvelteConsentStores {
	kernel: ConsentKernel;
	snapshot: Readable<ConsentSnapshot>;
	consents: Readable<Readonly<ConsentState>>;
	hasConsented: Readable<boolean>;
	activeUI: Readable<ConsentSnapshot['activeUI']>;
	model: Readable<ConsentSnapshot['model']>;
	consent(category: ConsentCategory): Readable<boolean>;
	setConsent: ConsentKernel['set']['consent'];
	save: ConsentKernel['commands']['save'];
	identify: ConsentKernel['commands']['identify'];
	init: ConsentKernel['commands']['init'];
}

function createTransport(options: SvelteConsentOptions): KernelTransport {
	if (options.transport) return options.transport;
	if (options.mode === 'hosted' || options.backendURL) {
		return createHostedTransport({
			backendURL: options.backendURL ?? '/api/c15t',
			domain: options.domain,
			headers: options.headers,
			fetch: options.fetch,
		});
	}
	return createOfflineTransport();
}

export function createConsentStores(
	kernel: ConsentKernel
): SvelteConsentStores {
	const snapshot = readable(kernel.getSnapshot(), (set) => {
		set(kernel.getSnapshot());
		return kernel.subscribe(set);
	});

	return {
		kernel,
		snapshot,
		consents: derived(snapshot, ($snapshot) => $snapshot.consents),
		hasConsented: derived(snapshot, ($snapshot) => $snapshot.hasConsented),
		activeUI: derived(snapshot, ($snapshot) => $snapshot.activeUI),
		model: derived(snapshot, ($snapshot) => $snapshot.model),
		consent(category) {
			return derived(snapshot, ($snapshot) => $snapshot.consents[category]);
		},
		setConsent: kernel.set.consent,
		save: kernel.commands.save,
		identify: kernel.commands.identify,
		init: kernel.commands.init,
	};
}

export function provideConsentKernel(kernel: ConsentKernel): ConsentKernel {
	setContext(kernelContextKey, kernel);
	return kernel;
}

export function useConsentKernel(): ConsentKernel {
	const kernel = getContext<ConsentKernel | undefined>(kernelContextKey);
	if (!kernel) {
		throw new Error(
			'c15t: no Svelte v3 kernel in context. Call provideConsentKernel(kernel) in an ancestor component.'
		);
	}
	return kernel;
}

export function createConsent(options: SvelteConsentOptions = {}) {
	const kernel = createConsentKernel({
		...options,
		transport: createTransport(options),
	});
	return createConsentStores(kernel);
}

export function provideConsent(options: SvelteConsentOptions = {}) {
	const stores = createConsent(options);
	provideConsentKernel(stores.kernel);
	return stores;
}

export type {
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	HostedTransportOptions,
	KernelConfig,
	KernelTransport,
};
export { createConsentKernel, createHostedTransport, createOfflineTransport };
