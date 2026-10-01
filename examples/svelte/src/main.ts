import { mount } from 'svelte';
import type { Component } from 'svelte';

import App from './App.svelte';

import './style.css';

// The Branded link loads a stylesheet that overrides c15t's theme tokens.
if (new URLSearchParams(location.search).get('design') === 'branded') {
	await import('./consent-theme.css');
}

// `?experiment=1` mounts the banner-experiment variant of `App.svelte`.
const Root: Component =
	new URLSearchParams(location.search).get('experiment') === '1'
		? (await import('./ExperimentApp.svelte')).default
		: App;

const target = document.getElementById('app');
if (!target) {
	throw new Error('Missing #app');
}
mount(Root, { target });
