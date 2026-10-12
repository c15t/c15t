import { cn as baseCn } from '@c15t/ui/utils';
import type { ClassValue } from '@c15t/ui/utils';
import { twMerge } from 'tailwind-merge';

export const cn = function cn(...inputs: ClassValue[]) {
	return twMerge(baseCn(...inputs));
};
