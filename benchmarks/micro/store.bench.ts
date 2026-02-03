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

bench('setShowPopup', () => {
	const store = createConsentManagerStore(manager);
	store.getState().setShowPopup(true);
	store.getState().setShowPopup(false);
});

bench('setIsPrivacyDialogOpen', () => {
	const store = createConsentManagerStore(manager);
	store.getState().setIsPrivacyDialogOpen(true);
	store.getState().setIsPrivacyDialogOpen(false);
});

await run();
