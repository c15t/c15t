import { cn as baseCn } from '@c15t/ui/utils';
import type { ClassValue } from '@c15t/ui/utils';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(baseCn(...inputs));
}
