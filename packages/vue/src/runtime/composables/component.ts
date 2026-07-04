import { computed } from 'vue';
import type { ConsentConfig } from '../config';
import { useConsentConfig } from './config';

type ComponentName = keyof NonNullable<ConsentConfig['components']>;
type ComponentSlots = NonNullable<ConsentConfig['components']>[ComponentName];

export function useConsentComponent(name: ComponentName) {
	const config = useConsentConfig();

	return computed(() => {
		const components = config.value.components;
		if (!components) {
			return {} as ComponentSlots;
		}

		return (components[name] ?? {}) as ComponentSlots;
	});
}
