import type { DevToolsOptions } from '@c15t/dev-tools';

/** Props for the kernel-bound Svelte DevTools adapter. */
export type ConsentDevToolsProps = Omit<
	DevToolsOptions,
	'container' | 'kernel'
>;

/** Backward-compatible props name for the ConsentDevTools component. */
export type C15TDevToolsProps = ConsentDevToolsProps;

/** Compatible props name for the DevTools component alias. */
export type DevToolsProps = ConsentDevToolsProps;
