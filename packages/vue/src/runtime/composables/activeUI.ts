import { inject } from 'vue';

import { symbolActiveUI } from '../utils/symbols';

export function useConsentActiveUI() {
	const activeUI = inject(symbolActiveUI);
	if (!activeUI) throw new Error('[c15t] Active UI not found');
	return activeUI;
}
