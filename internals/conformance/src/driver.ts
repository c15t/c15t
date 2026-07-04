/**
 * Framework-agnostic test driver.
 *
 * Each framework package implements this interface once; the conformance
 * suites consume it to exercise behavior without knowing whether the
 * underlying UI is React, Svelte, Vue, or Solid.
 *
 * The driver's job is to own the framework-specific rendering lifecycle
 * and expose a uniform surface for the suites to interact with.
 */

export type SupportedFramework = 'react' | 'svelte' | 'vue' | 'solid';

/**
 * Component kinds the driver can mount. Keys map 1:1 with our prebuilt UI
 * packages; adding a new component means extending this union everywhere
 * (on purpose — the contract should be explicit).
 */
export type MountableComponent =
	| 'consent-banner'
	| 'consent-dialog'
	| 'consent-widget'
	| 'iab-consent-banner'
	| 'iab-consent-dialog';

export type MountOptions = {
	component: MountableComponent;
	/**
	 * Options passed to the framework provider. The shape mirrors
	 * `ConsentManagerOptions` from `@c15t/core` — we reference it loosely
	 * (`unknown`) so this package stays zero-import on runtime framework code.
	 */
	providerOptions?: unknown;
	/** Optional initial store state for test isolation. */
	initialState?: unknown;
	/** Locale override, applied before first render. */
	locale?: string;
};

export type MountResult = {
	/** Root element the component was rendered into. */
	root: HTMLElement;
	/** Tear down the component, remove listeners, detach from DOM. */
	unmount: () => void | Promise<void>;
};

/**
 * Minimal store surface the suites rely on. Drivers proxy this to the
 * underlying Zustand store; we intentionally don't expose `setState` so
 * suites mutate only through user-facing actions.
 */
export type DriverStore = {
	getState(): Record<string, unknown>;
	subscribe(listener: () => void): () => void;
};

export interface TestDriver {
	readonly framework: SupportedFramework;

	/**
	 * Mount a component into a fresh DOM container. The driver owns the
	 * container lifecycle and must clean up in `unmount`.
	 */
	mount(opts: MountOptions): Promise<MountResult>;

	/** Access the active consent store after `mount`. */
	getStore(): DriverStore;

	/**
	 * Server-render the component to HTML. Used by the SSR conformance suite.
	 * If the framework binding has no SSR support yet, throw — the suite
	 * will skip gracefully.
	 */
	serverRender(opts: MountOptions): Promise<string>;
}

/**
 * Default sentinel thrown by stub drivers so the suites can detect
 * "not-implemented-yet" and emit `test.todo` instead of real failures.
 */
export class DriverNotImplementedError extends Error {
	constructor(framework: SupportedFramework, capability: string) {
		super(
			`[${framework}] driver does not yet implement: ${capability}. This is expected for stub frameworks; add an implementation when the binding comes online.`
		);
		this.name = 'DriverNotImplementedError';
	}
}
