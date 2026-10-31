/**
 * The resolved theme and parts, provided once per surface.
 *
 * A surface resolves its styles at the root and every primitive under it reads
 * them from here, so a host override reaches the deepest row without a prop
 * threaded through each layer.
 */

import { createContext, useContext } from 'react';

import type { ConsentStyles } from '../../theme/use-consent-styles';

const ConsentStylesContext = createContext<ConsentStyles | null>(null);

/** Provides the styles a surface resolved at its root. */
export const ConsentStylesProvider = ConsentStylesContext.Provider;

/**
 * Read the styles of the surface this primitive sits in.
 *
 * @returns The theme, parts, and safe area.
 * @throws {Error} When rendered outside a consent surface.
 */
export const useNativeStyles = function useNativeStyles(): ConsentStyles {
	const styles = useContext(ConsentStylesContext);

	if (styles === null) {
		throw new Error(
			'c15t: a native consent primitive rendered outside a consent surface.'
		);
	}

	return styles;
};
