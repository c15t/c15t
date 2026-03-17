<script lang="ts">
import { generateThemeCSS } from '@c15t/ui/theme';
import { deepMerge, setupColorScheme } from '@c15t/ui/utils';
import { type ConsentStoreState, getOrCreateConsentRuntime } from 'c15t';
import type { Snippet } from 'svelte';
import { onDestroy, onMount, untrack } from 'svelte';
import { setConsentContext, setThemeContext } from '../context.svelte';
import type { ConsentManagerOptions } from '../types';
import { defaultTheme } from '../utils';
import { version } from '../version';

let {
	children,
	options,
}: {
	children: Snippet;
	options: ConsentManagerOptions;
} = $props();

// Initialize consent runtime once from initial options.
// getOrCreateConsentRuntime is idempotent (caches by config),
// so it's safe to call with the initial options snapshot.
// untrack() signals that we intentionally only read the initial value.
const { consentManager, consentStore } = untrack(() =>
	getOrCreateConsentRuntime(options, { pkg: '@c15t/svelte', version })
);

// Initialise from current store snapshot, then subscribe for updates.
// No isFirstCall guard needed — setting the same value is a no-op,
// and skipping would discard legitimate updates during HMR re-runs.
let consentState = $state<ConsentStoreState>(consentStore.getState());

$effect(() => {
	const unsubscribe = consentStore.subscribe((newState) => {
		consentState = newState;
	});
	return unsubscribe;
});

// Provide consent context
setConsentContext({
	get state() {
		return consentState;
	},
	store: consentStore,
	manager: consentManager,
});

// Detect OS prefers-reduced-motion for accessibility.
// Falls back to false during SSR, then updates reactively on the client.
let prefersReducedMotion = $state(false);

onMount(() => {
	if (typeof window === 'undefined' || !window.matchMedia) return;
	const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
	prefersReducedMotion = mediaQuery.matches;

	const handler = (e: MediaQueryListEvent) => {
		prefersReducedMotion = e.matches;
	};
	mediaQuery.addEventListener('change', handler);
	return () => mediaQuery.removeEventListener('change', handler);
});

// Set up theme
const mergedTheme = $derived(deepMerge(defaultTheme, options.theme ?? {}));

setThemeContext({
	get theme() {
		return mergedTheme;
	},
	get noStyle() {
		return options.noStyle;
	},
	get disableAnimation() {
		// Auto-disable animations if OS preference is set, unless explicitly overridden
		return options.disableAnimation ?? prefersReducedMotion;
	},
	get trapFocus() {
		return options.trapFocus ?? true;
	},
	get scrollLock() {
		return options.scrollLock;
	},
	get colorScheme() {
		return options.colorScheme;
	},
});

const themeCSS = $derived(generateThemeCSS(mergedTheme));

// Inject theme CSS safely via textContent (immune to XSS).
// The $effect only updates textContent on theme changes — no remove/re-add cycle.
// Cleanup happens once on component destroy via onDestroy.
let themeStyleEl: HTMLStyleElement | null = null;
let ownedStyleEl = false;

$effect(() => {
	if (!themeCSS) return;
	if (!themeStyleEl) {
		themeStyleEl = document.getElementById(
			'c15t-theme'
		) as HTMLStyleElement | null;
		if (!themeStyleEl) {
			themeStyleEl = document.createElement('style');
			themeStyleEl.id = 'c15t-theme';
			document.head.appendChild(themeStyleEl);
			ownedStyleEl = true;
		}
	}
	themeStyleEl.textContent = themeCSS;
});

onDestroy(() => {
	if (ownedStyleEl && themeStyleEl) {
		themeStyleEl.remove();
		themeStyleEl = null;
		ownedStyleEl = false;
	}
});

// Set up color scheme
$effect(() => {
	if (options.colorScheme == null) return;
	return setupColorScheme(options.colorScheme);
});
</script>

{@render children()}
