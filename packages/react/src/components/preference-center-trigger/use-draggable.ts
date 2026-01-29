'use client';

/**
 * React hook for drag-to-corner functionality.
 *
 * Wraps the framework-agnostic utilities from @c15t/ui with React state management.
 *
 * @packageDocumentation
 */

import {
	type CornerPosition,
	calculateCornerFromDrag,
	createInitialDragState,
	type DragState,
	getPersistedPosition,
	persistPosition as persistToStorage,
} from '@c15t/ui/utils';
import { useCallback, useRef, useState } from 'react';

/**
 * Options for the useDraggable hook.
 */
export interface UseDraggableOptions {
	/**
	 * Default corner position.
	 * @default 'bottom-right'
	 */
	defaultPosition?: CornerPosition;

	/**
	 * Whether to persist position to localStorage.
	 * @default true
	 */
	persistPosition?: boolean;

	/**
	 * Callback when position changes.
	 */
	onPositionChange?: (position: CornerPosition) => void;
}

/**
 * Return type for the useDraggable hook.
 */
export interface UseDraggableReturn {
	/** Current corner position */
	corner: CornerPosition;

	/** Whether currently dragging */
	isDragging: boolean;

	/** Whether transitioning to a new corner (for animation) */
	isSnapping: boolean;

	/** Whether the last interaction was a drag (moved more than threshold) */
	wasDragged: () => boolean;

	/** Event handlers to attach to the draggable element */
	handlers: {
		onPointerDown: (e: React.PointerEvent) => void;
		onPointerMove: (e: React.PointerEvent) => void;
		onPointerUp: (e: React.PointerEvent) => void;
		onPointerCancel: (e: React.PointerEvent) => void;
	};

	/** Current transform style for drag offset */
	dragStyle: React.CSSProperties;
}

/**
 * Hook for making an element draggable between viewport corners.
 *
 * @param options - Configuration options
 * @returns Object with corner position, drag state, event handlers, and styles
 *
 * @example
 * ```tsx
 * function DraggableButton() {
 *   const { corner, isDragging, handlers, dragStyle } = useDraggable({
 *     defaultPosition: 'bottom-right',
 *     persistPosition: true,
 *   });
 *
 *   return (
 *     <button
 *       {...handlers}
 *       style={dragStyle}
 *       className={cn(styles.button, styles[corner])}
 *     >
 *       Drag me
 *     </button>
 *   );
 * }
 * ```
 */
export function useDraggable(
	options: UseDraggableOptions = {}
): UseDraggableReturn {
	const {
		defaultPosition = 'bottom-right',
		persistPosition = true,
		onPositionChange,
	} = options;

	// Initialize corner from persisted position or default
	const [corner, setCorner] = useState<CornerPosition>(() => {
		if (persistPosition && typeof window !== 'undefined') {
			const persisted = getPersistedPosition();
			if (persisted) {
				return persisted;
			}
		}
		return defaultPosition;
	});

	const [dragState, setDragState] = useState<DragState>(createInitialDragState);
	const [isSnapping, setIsSnapping] = useState(false);

	// Ref to track if we've moved enough to consider it a drag vs click
	const hasDraggedRef = useRef(false);
	const elementRef = useRef<HTMLElement | null>(null);
	// Track drag start time for velocity calculation
	const dragStartTimeRef = useRef<number>(0);

	// Update corner and optionally persist
	const updateCorner = useCallback(
		(newCorner: CornerPosition) => {
			setCorner(newCorner);
			if (persistPosition) {
				persistToStorage(newCorner);
			}
			onPositionChange?.(newCorner);
		},
		[persistPosition, onPositionChange]
	);

	// Handle pointer down - start tracking
	const handlePointerDown = useCallback((e: React.PointerEvent) => {
		// Only handle primary button (left click / single touch)
		if (e.button !== 0) {
			return;
		}

		// Capture pointer for tracking outside element
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		elementRef.current = e.target as HTMLElement;
		hasDraggedRef.current = false;
		dragStartTimeRef.current = Date.now();

		setDragState({
			isDragging: true,
			startX: e.clientX,
			startY: e.clientY,
			currentX: e.clientX,
			currentY: e.clientY,
		});

		setIsSnapping(false);
	}, []);

	// Handle pointer move - update position
	const handlePointerMove = useCallback((e: React.PointerEvent) => {
		setDragState((prev) => {
			if (!prev.isDragging) {
				return prev;
			}

			// Check if we've moved enough to be considered a drag
			const dx = Math.abs(e.clientX - prev.startX);
			const dy = Math.abs(e.clientY - prev.startY);
			if (dx > 5 || dy > 5) {
				hasDraggedRef.current = true;
			}

			return {
				...prev,
				currentX: e.clientX,
				currentY: e.clientY,
			};
		});
	}, []);

	// Handle pointer up - snap based on drag direction
	const handlePointerUp = useCallback(
		(e: React.PointerEvent) => {
			if (elementRef.current) {
				elementRef.current.releasePointerCapture(e.pointerId);
			}

			setDragState((prev) => {
				if (!prev.isDragging) {
					return prev;
				}

				// Only snap if we actually dragged
				if (hasDraggedRef.current) {
					// Calculate drag direction and velocity
					const dragX = e.clientX - prev.startX;
					const dragY = e.clientY - prev.startY;
					const dragDuration = Date.now() - dragStartTimeRef.current;

					// Calculate velocity (pixels per millisecond)
					const velocityX = dragDuration > 0 ? dragX / dragDuration : 0;
					const velocityY = dragDuration > 0 ? dragY / dragDuration : 0;

					// Get new corner based on drag direction and velocity
					const newCorner = calculateCornerFromDrag(corner, dragX, dragY, {
						velocityX,
						velocityY,
					});

					// Only animate if actually changing corners
					if (newCorner !== corner) {
						setIsSnapping(true);
						setTimeout(() => setIsSnapping(false), 300);
						updateCorner(newCorner);
					}
				}

				return createInitialDragState();
			});
		},
		[corner, updateCorner]
	);

	// Handle pointer cancel
	const handlePointerCancel = useCallback((e: React.PointerEvent) => {
		if (elementRef.current) {
			elementRef.current.releasePointerCapture(e.pointerId);
		}
		setDragState(createInitialDragState());
	}, []);

	// Calculate transform style for drag offset
	const dragStyle: React.CSSProperties = dragState.isDragging
		? {
				transform: `translate(${dragState.currentX - dragState.startX}px, ${dragState.currentY - dragState.startY}px)`,
				transition: 'none',
			}
		: {};

	// Function to check if the last interaction was a drag
	const wasDragged = useCallback(() => hasDraggedRef.current, []);

	return {
		corner,
		isDragging: dragState.isDragging,
		isSnapping,
		wasDragged,
		handlers: {
			onPointerDown: handlePointerDown,
			onPointerMove: handlePointerMove,
			onPointerUp: handlePointerUp,
			onPointerCancel: handlePointerCancel,
		},
		dragStyle,
	};
}
