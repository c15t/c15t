import { configureConsentManager, createConsentManagerStore } from 'c15t';
import { bench, run } from 'mitata';

// Pre-create a manager for benchmarks that need it
const manager = configureConsentManager({ mode: 'offline' });

bench('configureConsentManager', () => {
	configureConsentManager({ mode: 'offline' });
});

bench('createConsentManagerStore', () => {
	createConsentManagerStore(manager);
});

bench('store.getState()', () => {
	const store = createConsentManagerStore(manager);
	store.getState();
});

bench('saveConsents("all")', async () => {
	const store = createConsentManagerStore(manager);
	await store.getState().saveConsents('all');
});

bench('saveConsents("necessary")', async () => {
	const store = createConsentManagerStore(manager);
	await store.getState().saveConsents('necessary');
});

bench('saveConsents("custom")', async () => {
	const store = createConsentManagerStore(manager);
	await store.getState().saveConsents('custom');
});

bench('resetConsents', () => {
	const store = createConsentManagerStore(manager);
	store.getState().resetConsents();
});

bench('setActiveUI', () => {
	const store = createConsentManagerStore(manager);
	store.getState().setActiveUI('banner', { force: true });
	store.getState().setActiveUI('dialog');
	store.getState().setActiveUI('none');
});

await run();
