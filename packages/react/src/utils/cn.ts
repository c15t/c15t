import clsx, { type ClassValue } from 'clsx';

export type { ClassValue } from 'clsx';

/**
 * Utilizes `clsx` with `tailwind-merge`, use in cases of possible class conflicts.
 */
export function cnExt(...classes: ClassValue[]) {
	return clsx(...classes);
}

/**
 * A direct export of `clsx` without `tailwind-merge`.
 */
export const cn = clsx;
