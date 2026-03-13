<script lang="ts">
	import type { Snippet } from 'svelte';
	import { untrack } from 'svelte';
	import { generateThemeCSS } from '@c15t/ui/theme';
	import { deepMerge, setupColorScheme } from '@c15t/ui/utils';
	import {
		type ConsentStoreState,
		getOrCreateConsentRuntime,
	} from 'c15t';
	import {
		setConsentContext,
		setThemeContext,
	} from '../context.svelte';
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

	// Set up theme
	const mergedTheme = $derived(
		deepMerge(defaultTheme, options.theme ?? {})
	);

	setThemeContext({
		get theme() {
			return mergedTheme;
		},
		get noStyle() {
			return options.noStyle;
		},
		get disableAnimation() {
			return options.disableAnimation;
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

	// Inject theme CSS safely via textContent (immune to XSS)
	$effect(() => {
		if (!themeCSS) return;
		let style = document.getElementById('c15t-theme') as HTMLStyleElement | null;
		if (!style) {
			style = document.createElement('style');
			style.id = 'c15t-theme';
			document.head.appendChild(style);
		}
		style.textContent = themeCSS;
		return () => {
			style?.remove();
		};
	});

	// Set up color scheme
	$effect(() => {
		if (options.colorScheme == null) return;
		return setupColorScheme(options.colorScheme);
	});
</script>

{@render children()}
