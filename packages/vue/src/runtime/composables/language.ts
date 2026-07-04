import { type Ref } from 'vue';
import { useCookie } from '#imports';

export function useConsentLanguage(): Ref<string | null> {
	return useCookie<string | null>('c15t:language');
}
