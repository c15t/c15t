'use client';
import type { NamespaceProps, PrivacyConsentState } from 'c15t';

import {
	createContext,
	type FC,
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react';
import type { StoreApi } from 'zustand/vanilla';
import DevToolWrapper from './components/wrapper';
import type { Corners } from './libs/draggable';
import { Router } from './router/router';

const STORAGE_KEY_POSITION = 'c15t-devtools-position';

const PrivacyC15TContext = createContext<{
	state: PrivacyConsentState | null;
	store: StoreApi<PrivacyConsentState> | null;
} | null>(null);

export const getStore = () => {
	const context = useContext(PrivacyC15TContext);
	if (context === null) {
		throw new Error(
			'useConsentManagerContext must be used within a ConsentManagerProvider'
		);
	}

	// Create a subscription to the store updates
	const [localState, setLocalState] = useState(context.state);

	useEffect(() => {
		if (!context.store) {
			return;
		}

		// Update local state when context state changes
		setLocalState(context.state);

		// Subscribe to store updates
		const unsubscribe = context.store.subscribe(
			(newState: PrivacyConsentState) => {
				setLocalState(newState);
			}
		);

		return () => {
			unsubscribe();
		};
	}, [context.store, context.state]);

	return localState;
};

export default PrivacyC15TContext;

export interface ConsentManagerProviderProps extends NamespaceProps {
	position?: Corners;
}

/**
 * Load position from localStorage
 *
 * @param defaultPosition - The default position if none is stored
 * @returns The stored position or the default
 */
function loadPosition(defaultPosition: Corners): Corners {
	if (typeof window === 'undefined') {
		return defaultPosition;
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY_POSITION);
		if (stored) {
			const parsed = JSON.parse(stored) as Corners;
			// Validate the stored value
			if (
				['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(
					parsed
				)
			) {
				return parsed;
			}
		}
	} catch {
		// Silently fail and use default
	}

	return defaultPosition;
}

/**
 * Save position to localStorage
 *
 * @param position - The position to save
 */
function savePosition(position: Corners): void {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		localStorage.setItem(STORAGE_KEY_POSITION, JSON.stringify(position));
	} catch {
		// Silently fail if localStorage is not available
	}
}

export const C15TDevTools: FC<ConsentManagerProviderProps> = ({
	namespace = 'c15tStore',
	position: initialPosition = 'bottom-right',
}) => {
	const [state, setState] = useState<PrivacyConsentState | null>(null);
	const [store, setStore] = useState<StoreApi<PrivacyConsentState> | null>(
		null
	);
	const [isOpen, setIsOpen] = useState(false);
	const [position, setPosition] = useState<Corners>(() => {
		return loadPosition(initialPosition);
	});

	const toggleOpen = useCallback(() => {
		return setIsOpen((prev) => !prev);
	}, []);

	const handlePositionChange = useCallback((newPosition: Corners) => {
		setPosition(newPosition);
		savePosition(newPosition);
	}, []);

	useEffect(() => {
		const storeInstance =
			(typeof window !== 'undefined' &&
				(window as Window)[namespace as keyof Window]) ||
			null;

		if (storeInstance) {
			setStore(storeInstance);
			const currentState = storeInstance.getState() as PrivacyConsentState;
			setState(currentState);

			// Subscribe to store updates
			const unsubscribe = storeInstance.subscribe(
				(newState: PrivacyConsentState) => {
					setState(newState);
				}
			);

			return () => {
				unsubscribe();
			};
		}
		console.log(`${namespace} is not available on the window object.`);
	}, [namespace]);

	return (
		<PrivacyC15TContext.Provider value={{ state, store }}>
			<DevToolWrapper
				isOpen={isOpen}
				onPositionChange={handlePositionChange}
				position={position}
				toggleOpen={toggleOpen}
			>
				<Router onClose={toggleOpen} />
			</DevToolWrapper>
		</PrivacyC15TContext.Provider>
	);
};
