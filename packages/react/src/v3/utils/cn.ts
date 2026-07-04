import type { ClassValue } from '@c15t/ui/utils';
import { cn as baseCn } from '@c15t/ui/utils';

export type { ClassValue };

/**
 * Utilizes framework-agnostic `cn` from @c15t/ui.
 */
export function cnExt(...classes: ClassValue[]) {
	return baseCn(...classes);
}
