import { getConsentFromStorage } from '../../libs/cookie';
import { getOrCreateConsentRuntime } from '../index';

function create() {
	const runtime = getOrCreateConsentRuntime({
		mode: 'hosted',
		backendURL: '/api/c15t',
		consentCategories: ['necessary', 'measurement'],
		reloadOnConsentRevoked: false,
		retryConfig: { maxRetries: 3, initialDelayMs: 1, backoffFactor: 1 },
		overrides: { gpc: false },
	});
	const store = runtime.consentStore;
	return {
		state() {
			const state = store.getState();
			return {
				measurement: state.has('measurement'),
				consentInfo: state.consentInfo,
				source: state.initDataSource,
				activeUI: state.activeUI,
				loading: state.isLoadingConsentInfo,
				stored: getConsentFromStorage<{
					consents: { measurement: boolean };
					consentInfo: typeof state.consentInfo;
				}>(),
				cookie: document.cookie,
			};
		},
		save: (type: 'necessary' | 'all') => store.getState().saveConsents(type),
	};
}

declare global {
	interface Window {
		hostedStorageTest: ReturnType<typeof create>;
		createHostedStorageTest: typeof create;
	}
}

window.createHostedStorageTest = create;
