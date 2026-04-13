import { cn as baseCn, type ClassValue } from '@c15t/ui/utils';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(baseCn(...inputs));
}
