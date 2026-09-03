'use client';

/**
 * Root component for the ConsentDialogTrigger compound component.
 * Provides context and handles portal rendering.
 *
 * @packageDocumentation
 */

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useConsentDialogTrigger } from '~/component-hooks/use-consent-dialog-trigger';
import { useConsentManager } from '~/component-hooks/use-consent-manager';
import { useIsHydrated } from '~/hooks/use-is-hydrated';

import type { CornerPosition, TriggerVisibility } from '../types';
import { useDraggable } from '../use-draggable';
import type { UseDraggableReturn } from '../use-draggable';

/**
 * Context value for the ConsentDialogTrigger compound component.
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
	/** Open the consent dialog */
	openDialog: () => void;
	/** Whether the trigger should be visible */
	isVisible: boolean;
}

const TriggerContext = createContext<TriggerContextValue | null>(null);

/**
 * Hook to access the trigger context.
 * Must be used within a ConsentDialogTrigger.Root component.
 */
export const useTriggerContext =
	function useTriggerContext(): TriggerContextValue {
		const context = useContext(TriggerContext);
		if (!context) {
			throw new Error(
				'ConsentDialogTrigger components must be used within a ConsentDialogTrigger.Root'
			);
		}
		return context;
	};

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
 * <ConsentDialogTrigger.Root>
 *   <ConsentDialogTrigger.Button>
 *     <ConsentDialogTrigger.Icon />
 *   </ConsentDialogTrigger.Button>
 * </ConsentDialogTrigger.Root>
 * ```
 */
export const TriggerRoot = ({
	children,
	defaultPosition = 'bottom-right',
	persistPosition: shouldPersist = true,
	showWhen = 'after-consent',
	onPositionChange,
	onClick,
}: TriggerRootProps): ReactNode => {
	const { branding } = useConsentManager();
	const { isVisible, openDialog } = useConsentDialogTrigger({
		onClick,
		showWhen,
	});

	const { corner, isDragging, isSnapping, wasDragged, handlers, dragStyle } =
		useDraggable({
			defaultPosition,
			onPositionChange,
			persistPosition: shouldPersist,
		});

	const mounted = useIsHydrated();

	const contextValue = useMemo<TriggerContextValue>(
		() => ({
			branding,
			corner,
			dragStyle,
			handlers,
			isDragging,
			isSnapping,
			isVisible,
			openDialog,
			wasDragged,
		}),
		[
			branding,
			corner,
			dragStyle,
			handlers,
			isDragging,
			isSnapping,
			isVisible,
			openDialog,
			wasDragged,
		]
	);

	// Don't render on server or when not visible
	if (!mounted || !isVisible) {
		return null;
	}

	return createPortal(
		<TriggerContext.Provider value={contextValue}>
			{children}
		</TriggerContext.Provider>,
		document.body
	);
};

TriggerRoot.displayName = 'ConsentDialogTrigger.Root';

export { TriggerContext };
