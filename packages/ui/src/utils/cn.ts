import clsx, { type ClassValue } from 'clsx';

export type { ClassValue } from 'clsx';

/**
 * Utilizes `clsx` for framework-agnostic class merging.
 */
export function cn(...classes: ClassValue[]) {
	return clsx(...classes);
}
