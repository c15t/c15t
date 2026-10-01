/**
 * Which colour scheme the app and the consent surfaces render in.
 *
 * The surfaces resolve light or dark from `useColorScheme()` on their own. That is
 * the right default and the wrong way to review both: a reviewer who wants to see
 * the dark sheet has to leave the app and change the system setting. So the example
 * holds the choice, and hands it down.
 *
 * `system` is the default and passes no theme at all, which is how the surfaces are
 * documented to keep following the platform. Light and dark pass one of the
 * package's finished themes, so what a reviewer sees is the shipped palette rather
 * than the example's guess at it.
 */

import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from 'react';
import type { ReactNode } from 'react';

import type { Appearance } from './theme';
import { isAppearance } from './theme';

/** What the tree can read and change about the scheme. */
export interface AppearanceContextValue {
	/** The current choice. */
	readonly appearance: Appearance;
	/** Set it, including from a demo link. */
	readonly setAppearance: (appearance: Appearance) => void;
	/** Set it from an untrusted string, as a deep link carries one. */
	readonly setAppearanceFrom: (value: unknown) => boolean;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

/** Hold the scheme choice for the whole app. */
export const AppearanceProvider = ({
	children,
}: {
	readonly children: ReactNode;
}) => {
	const [appearance, setAppearance] = useState<Appearance>('system');

	const setAppearanceFrom = useCallback((value: unknown): boolean => {
		if (!isAppearance(value)) {
			return false;
		}

		setAppearance(value);

		return true;
	}, []);

	const value = useMemo<AppearanceContextValue>(
		() => ({ appearance, setAppearance, setAppearanceFrom }),
		[appearance, setAppearanceFrom]
	);

	return (
		<AppearanceContext.Provider value={value}>
			{children}
		</AppearanceContext.Provider>
	);
};

/**
 * Read and change the scheme choice.
 *
 * @returns The current choice and its setters.
 * @throws {Error} When rendered outside the provider.
 */
export const useAppearance = (): AppearanceContextValue => {
	const value = useContext(AppearanceContext);

	if (value === null) {
		throw new Error(
			'the scheme control has to render inside AppearanceProvider'
		);
	}

	return value;
};
