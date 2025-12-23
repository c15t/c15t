import { useContext } from 'preact/hooks';
import { GlobalThemeContext, LocalThemeContext } from '~/context/theme-context';

/**
 * Shallow check for plain objects (not arrays, not null)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deeply merges two objects, with `source` taking precedence.
 * Arrays are replaced, not merged.
 */
function deepMerge<T extends Record<string, unknown>>(
	target: T,
	source?: Partial<T> | null
): T {
	if (!source) return target;

	const result: Record<string, unknown> = { ...target };

	for (const key in source) {
		const s = source[key as keyof typeof source];
		const t = target[key as keyof typeof target];

		if (s === undefined) continue;

		if (isPlainObject(s) && isPlainObject(t)) {
			result[key] = deepMerge(
				t as Record<string, unknown>,
				s as Record<string, unknown>
			);
		} else {
			// Replace primitives, arrays, functions, etc.
			result[key] = s as unknown;
		}
	}

	return result as T;
}

/**
 * Access the current theme context, with local context overriding global.
 * Throws if used outside Theme.Root.
 */
export const useTheme = () => {
	const globalContext = useContext(GlobalThemeContext);
	const localContext = useContext(LocalThemeContext);

	if (!globalContext) {
		throw new Error('Theme components must be used within Theme.Root');
	}

	// Local overrides global
	const context = deepMerge(globalContext, localContext ?? null);
	return context;
};
