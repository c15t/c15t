import type { AllConsentNames, KernelOverrides, LegalLinks } from '@c15t/core';

import type {
	ConsentClientOptions,
	ConsentModeName,
	ConsentUIOptions,
} from './types';

/** Attribute that turns auto-init off so the page calls `c15t.init()`. */
export const MANUAL_ATTRIBUTE = 'data-manual';

const MODES: ReadonlySet<string> = new Set<ConsentModeName>([
	'hosted',
	'offline',
	'manifest',
]);
const SCHEMES: ReadonlySet<string> = new Set(['light', 'dark', 'system']);

const readList = function readList(value: string | null): string[] | undefined {
	if (!value) {
		return undefined;
	}
	const items = value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
	return items.length > 0 ? items : undefined;
};

const readFlag = function readFlag(element: Element, name: string): boolean {
	const value = element.getAttribute(name);
	return value !== null && value !== 'false';
};

const readLegalLinks = function readLegalLinks(
	element: Element
): LegalLinks | undefined {
	const links: LegalLinks = {};
	const privacy = element.getAttribute('data-privacy-policy-url');
	const cookie = element.getAttribute('data-cookie-policy-url');
	const terms = element.getAttribute('data-terms-url');
	if (privacy) {
		links.privacyPolicy = { href: privacy };
	}
	if (cookie) {
		links.cookiePolicy = { href: cookie };
	}
	if (terms) {
		links.termsOfService = { href: terms };
	}
	return Object.keys(links).length > 0 ? links : undefined;
};

const readOverrides = function readOverrides(
	element: Element
): KernelOverrides | undefined {
	const overrides: KernelOverrides = {};
	const country = element.getAttribute('data-country');
	const region = element.getAttribute('data-region');
	const language = element.getAttribute('data-language');
	if (country) {
		overrides.country = country;
	}
	if (region) {
		overrides.region = region;
	}
	if (language) {
		overrides.language = language;
	}
	return Object.keys(overrides).length > 0 ? overrides : undefined;
};

/**
 * Read client options from a `<script>` tag's `data-*` attributes.
 *
 * ```html
 * <script src="https://cdn.jsdelivr.net/npm/@c15t/browser/dist/c15t.js"
 *   data-backend-url="https://your-instance.c15t.dev"
 *   data-categories="measurement,marketing"
 *   data-color-scheme="dark"
 *   data-privacy-policy-url="/privacy"
 *   defer></script>
 * ```
 *
 * @param element - The script element, or `null` outside a classic script.
 * @returns Options for `init()`.
 */
// oxlint-disable-next-line complexity -- One attribute per branch; a table would hide the shape.
export const readScriptOptions = function readScriptOptions(
	element: Element | null
): ConsentClientOptions {
	if (!element) {
		return {};
	}
	const options: ConsentClientOptions = {};
	const backendURL =
		element.getAttribute('data-backend-url') ??
		element.getAttribute('data-backend');
	if (backendURL) {
		options.backendURL = backendURL;
	}
	const mode = element.getAttribute('data-mode');
	if (mode && MODES.has(mode)) {
		options.mode = mode as ConsentModeName;
	}
	const manifestURL = element.getAttribute('data-manifest-url');
	if (manifestURL) {
		options.manifestURL = manifestURL;
	}
	const policies = readList(element.getAttribute('data-policies'));
	if (policies) {
		options.policies = policies as ConsentClientOptions['policies'];
	}
	const categories = readList(element.getAttribute('data-categories'));
	if (categories) {
		options.consentCategories = categories as AllConsentNames[];
	}
	const overrides = readOverrides(element);
	if (overrides) {
		options.overrides = overrides;
	}
	const legalLinks = readLegalLinks(element);
	if (legalLinks) {
		options.legalLinks = legalLinks;
	}
	if (readFlag(element, 'data-no-ui')) {
		options.ui = false;
		return options;
	}
	const ui: ConsentUIOptions = {};
	const scheme = element.getAttribute('data-color-scheme');
	if (scheme && SCHEMES.has(scheme)) {
		ui.colorScheme = scheme as ConsentUIOptions['colorScheme'];
	}
	if (element.getAttribute('data-shadow') === 'false') {
		ui.shadow = false;
	}
	if (readFlag(element, 'data-trigger')) {
		ui.trigger = true;
	}
	if (readFlag(element, 'data-hide-branding')) {
		ui.banner = { hideBranding: true };
		ui.dialog = { hideBranding: true };
	}
	if (Object.keys(ui).length > 0) {
		options.ui = ui;
	}
	return options;
};

const mergeUI = function mergeUI(
	base: ConsentClientOptions['ui'],
	override: ConsentClientOptions['ui']
): ConsentClientOptions['ui'] {
	if (override === false || base === false) {
		return override ?? base;
	}
	if (!(base && override)) {
		return override ?? base;
	}
	return { ...base, ...override };
};

/**
 * Layer one options object over another. `ui` merges rather than
 * replaces, so `data-color-scheme` on the tag survives a queued
 * `config` that only turns the trigger on.
 *
 * @param base - The options underneath.
 * @param override - The options on top.
 * @returns The merged options.
 */
export const mergeClientOptions = function mergeClientOptions(
	base: ConsentClientOptions,
	override: ConsentClientOptions
): ConsentClientOptions {
	const merged: ConsentClientOptions = {
		...base,
		...override,
		ui: mergeUI(base.ui, override.ui),
	};
	if (merged.ui === undefined) {
		delete merged.ui;
	}
	return merged;
};

/**
 * Resolve the page's options: the script tag's attributes first, then each
 * queued `config` call on top, in order.
 *
 * @param script - The current script element.
 * @param configs - Options queued as `['config', options]` before load.
 * @returns Options and whether the page asked to init itself.
 */
export const readPageOptions = function readPageOptions(
	script: Element | null,
	configs: ConsentClientOptions[] = []
): { options: ConsentClientOptions; manual: boolean } {
	const options = configs.reduce(
		(merged, config) => mergeClientOptions(merged, config),
		readScriptOptions(script)
	);
	const manual = script !== null && readFlag(script, MANUAL_ATTRIBUTE);
	return { manual, options };
};
