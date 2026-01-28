'use client';

/**
 * Root component for the PreferenceCenterTrigger compound component.
 * Provides context and handles portal rendering.
 *
 * @packageDocumentation
 */

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useConsentManager } from '~/hooks/use-consent-manager';
import type { CornerPosition, TriggerVisibility } from '../types';
import { type UseDraggableReturn, useDraggable } from '../use-draggable';

/**
 * Context value for the PreferenceCenterTrigger compound component.
 */
export interface TriggerContextValue {
	/** Current corner position */
	corner: CornerPosition;
	/** Whether currently dragging */
	isDragging: boolean;
	/** Whether transitioning to a new corner */
	isSnapping: boolean;
	/** Whether the last interaction was a drag */
	wasDragged: () => boolean;
	/** Drag event handlers */
	handlers: UseDraggableReturn['handlers'];
	/** Current transform style for drag offset */
	dragStyle: React.CSSProperties;
	/** Branding from consent manager */
	branding: string;
	/** Open the preference center */
	openDialog: () => void;
	/** Whether the trigger should be visible */
	isVisible: boolean;
}

const TriggerContext = createContext<TriggerContextValue | null>(null);

/**
 * Hook to access the trigger context.
 * Must be used within a PreferenceCenterTrigger.Root component.
 */
export function useTriggerContext(): TriggerContextValue {
	const context = useContext(TriggerContext);
	if (!context) {
		throw new Error(
			'PreferenceCenterTrigger components must be used within a PreferenceCenterTrigger.Root'
		);
	}
	return context;
}

/**
 * Props for the Root component.
 */
export interface TriggerRootProps {
	children: ReactNode;

	/**
	 * Default corner position for the trigger.
	 * @default 'bottom-right'
	 */
	defaultPosition?: CornerPosition;

	/**
	 * Whether to persist position in localStorage.
	 * @default true
	 */
	persistPosition?: boolean;

	/**
	 * Controls when the trigger is visible.
	 * @default 'after-consent'
	 */
	showWhen?: TriggerVisibility;

	/**
	 * Callback when position changes.
	 */
	onPositionChange?: (position: CornerPosition) => void;

	/**
	 * Callback when trigger is clicked.
	 */
	onClick?: () => void;
}

/**
 * Root component that provides context and handles positioning.
 *
 * @example
 * ```tsx
 * <PreferenceCenterTrigger.Root>
 *   <PreferenceCenterTrigger.Button>
 *     <PreferenceCenterTrigger.Icon />
 *   </PreferenceCenterTrigger.Button>
 * </PreferenceCenterTrigger.Root>
 * ```
 */
export function TriggerRoot({
	children,
	defaultPosition = 'bottom-right',
	persistPosition: shouldPersist = true,
	showWhen = 'after-consent',
	onPositionChange,
	onClick,
}: TriggerRootProps): ReactNode {
	const {
		branding,
		isPrivacyDialogOpen,
		setIsPrivacyDialogOpen,
		hasConsented,
	} = useConsentManager();

	const { corner, isDragging, isSnapping, wasDragged, handlers, dragStyle } =
		useDraggable({
			defaultPosition,
			persistPosition: shouldPersist,
			onPositionChange,
		});

	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		return () => setMounted(false);
	}, []);

	// Determine visibility
	const shouldShow = (() => {
		if (showWhen === 'never') {
			return false;
		}
		if (showWhen === 'after-consent') {
			return hasConsented();
		}
		return true;
	})();

	const isVisible = shouldShow && !isPrivacyDialogOpen;

	const openDialog = () => {
		onClick?.();
		setIsPrivacyDialogOpen(true);
	};

	// Don't render on server or when not visible
	if (!mounted || !isVisible) {
		return null;
	}

	const contextValue: TriggerContextValue = {
		corner,
		isDragging,
		isSnapping,
		wasDragged,
		handlers,
		dragStyle,
		branding,
		openDialog,
		isVisible,
	};

	return createPortal(
		<TriggerContext.Provider value={contextValue}>
			{children}
		</TriggerContext.Provider>,
		document.body
	);
}

TriggerRoot.displayName = 'PreferenceCenterTrigger.Root';

export { TriggerContext };
