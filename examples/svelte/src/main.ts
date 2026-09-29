import { mount } from 'svelte';

import App from './App.svelte';

import './style.css';

// The Branded link loads a stylesheet that overrides c15t's theme tokens.
if (new URLSearchParams(location.search).get('design') === 'branded') {
	await import('./consent-theme.css');
}

const target = document.getElementById('app');
if (!target) {
	throw new Error('Missing #app');
}
mount(App, { target });
