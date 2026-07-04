import { inject } from 'vue';
import {
	symbolKernel,
	symbolKernelContext,
	symbolSnapshot,
} from '../utils/symbols';

export function useConsentKernel() {
	const kernel = inject(symbolKernel);
	if (!kernel) throw new Error('[c15t] Kernel not found');
	return kernel;
}

export function useConsentSnapshot() {
	const snapshot = inject(symbolSnapshot);
	if (!snapshot) throw new Error('[c15t] Kernel snapshot not found');
	return snapshot;
}

export function useConsentKernelContext() {
	const context = inject(symbolKernelContext);
	if (!context) throw new Error('[c15t] Kernel context not found');
	return context;
}
