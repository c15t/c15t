import { inject } from 'vue';
import { symbolInit } from '../utils/symbols';

export function useConsentInit() {
	const init = inject(symbolInit);
	if (!init) throw new Error('[c15t] Init not found');
	return init;
}
