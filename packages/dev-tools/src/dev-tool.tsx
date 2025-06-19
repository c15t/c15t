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
import { ErrorState } from './components/error-state';
import { Header } from './components/header';
import DevToolWrapper from './components/wrapper';
import { Router } from './router/router';
import './styles/theme.css';
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
	position?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left';
}

export const C15TDevTools: FC<ConsentManagerProviderProps> = ({
	namespace = 'c15tStore',
	position = 'bottom-right',
}) => {
	const [state, setState] = useState<PrivacyConsentState | null>(null);
	const [store, setStore] = useState<StoreApi<PrivacyConsentState> | null>(
		null
	);
	const [isOpen, setIsOpen] = useState(false);
	const toggleOpen = useCallback(() => setIsOpen((prev) => !prev), []);

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
		// biome-ignore lint/suspicious/noConsole: needed for dev tools
		console.log(`${namespace} is not available on the window object.`);
	}, [namespace]);

	return (
		<PrivacyC15TContext.Provider value={{ state, store }}>
			<DevToolWrapper
				isOpen={isOpen}
				toggleOpen={toggleOpen}
				position={position}
			>
				<Header onClose={() => setIsOpen(false)} />
				{state ? (
					<Router onClose={() => setIsOpen(false)} />
				) : (
					<ErrorState namespace={namespace} />
				)}
			</DevToolWrapper>
		</PrivacyC15TContext.Provider>
	);
};
