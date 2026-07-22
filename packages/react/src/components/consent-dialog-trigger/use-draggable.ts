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
	calculateNearestCorner,
	getPersistedPosition,
	persistPosition as persistToStorage,
} from '@c15t/ui/utils/trigger-utils';
import { useCallback, useEffect, useRef, useState } from 'react';

const DRAG_ACTIVATION_DISTANCE = 5;
const VIEWPORT_PADDING = 8;
const SNAP_DURATION = 320;

interface Position {
	left: number;
	top: number;
}

interface DragSession {
	pointerId: number;
	startPointerX: number;
	startPointerY: number;
	startLeft: number;
	startTop: number;
	width: number;
	height: number;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), Math.max(min, max));
}

function getDraggedPosition(
	session: DragSession,
	clientX: number,
	clientY: number,
	viewportWidth: number,
	viewportHeight: number
): Position {
	return {
		left: clamp(
			session.startLeft + clientX - session.startPointerX,
			VIEWPORT_PADDING,
			viewportWidth - session.width - VIEWPORT_PADDING
		),
		top: clamp(
			session.startTop + clientY - session.startPointerY,
			VIEWPORT_PADDING,
			viewportHeight - session.height - VIEWPORT_PADDING
		),
	};
}

function getSnappedPosition(
	corner: CornerPosition,
	width: number,
	height: number,
	horizontalOffset: number,
	verticalOffset: number,
	viewportWidth: number,
	viewportHeight: number
): Position {
	return {
		left: corner.includes('right')
			? viewportWidth - width - horizontalOffset
			: horizontalOffset,
		top: corner.includes('bottom')
			? viewportHeight - height - verticalOffset
			: verticalOffset,
	};
}

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

	/** Current fixed-position style while dragging or snapping */
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

	const [position, setPosition] = useState<Position | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [isSnapping, setIsSnapping] = useState(false);

	const hasDraggedRef = useRef(false);
	const elementRef = useRef<HTMLElement | null>(null);
	const captureTargetRef = useRef<Element | null>(null);
	const dragSessionRef = useRef<DragSession | null>(null);
	const coordinateModeRef = useRef(false);
	const cornerOffsetRef = useRef({ horizontal: 20, vertical: 20 });
	const snapFrameRef = useRef<number | null>(null);
	const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

	const clearSnapAnimation = useCallback(() => {
		if (snapFrameRef.current !== null) {
			cancelAnimationFrame(snapFrameRef.current);
			snapFrameRef.current = null;
		}
		if (snapTimerRef.current !== null) {
			clearTimeout(snapTimerRef.current);
			snapTimerRef.current = null;
		}
	}, []);

	const animateToPosition = useCallback(
		(target: Position) => {
			clearSnapAnimation();
			setIsDragging(false);
			setIsSnapping(true);
			snapFrameRef.current = requestAnimationFrame(() => {
				setPosition(target);
				snapFrameRef.current = null;
			});
			snapTimerRef.current = setTimeout(() => {
				setIsSnapping(false);
				snapTimerRef.current = null;
			}, SNAP_DURATION);
		},
		[clearSnapAnimation]
	);

	const releasePointerCapture = useCallback((pointerId: number) => {
		const captureTarget = captureTargetRef.current;
		if (captureTarget?.hasPointerCapture(pointerId)) {
			captureTarget.releasePointerCapture(pointerId);
		}
		captureTargetRef.current = null;
	}, []);

	// Handle pointer down - start tracking
	const handlePointerDown = useCallback(
		(e: React.PointerEvent) => {
			if (e.button !== 0) {
				return;
			}

			clearSnapAnimation();
			const element = e.currentTarget as HTMLElement;
			const captureTarget = e.target as Element;
			const rect = element.getBoundingClientRect();

			captureTarget.setPointerCapture(e.pointerId);
			elementRef.current = element;
			captureTargetRef.current = captureTarget;
			hasDraggedRef.current = false;
			dragSessionRef.current = {
				pointerId: e.pointerId,
				startPointerX: e.clientX,
				startPointerY: e.clientY,
				startLeft: rect.left,
				startTop: rect.top,
				width: rect.width,
				height: rect.height,
			};

			if (!coordinateModeRef.current) {
				cornerOffsetRef.current = {
					horizontal: Math.max(
						0,
						corner.includes('right')
							? window.innerWidth - rect.right
							: rect.left
					),
					vertical: Math.max(
						0,
						corner.includes('bottom')
							? window.innerHeight - rect.bottom
							: rect.top
					),
				};
				coordinateModeRef.current = true;
			}

			setPosition({ left: rect.left, top: rect.top });
			setIsDragging(true);
			setIsSnapping(false);
		},
		[clearSnapAnimation, corner]
	);

	// Handle pointer move - update position
	const handlePointerMove = useCallback((e: React.PointerEvent) => {
		const session = dragSessionRef.current;
		if (!session || session.pointerId !== e.pointerId) {
			return;
		}

		const deltaX = Math.abs(e.clientX - session.startPointerX);
		const deltaY = Math.abs(e.clientY - session.startPointerY);
		if (
			deltaX > DRAG_ACTIVATION_DISTANCE ||
			deltaY > DRAG_ACTIVATION_DISTANCE
		) {
			hasDraggedRef.current = true;
		}

		setPosition(
			getDraggedPosition(
				session,
				e.clientX,
				e.clientY,
				window.innerWidth,
				window.innerHeight
			)
		);
	}, []);

	// Snap to the nearest viewport corner from the release position.
	const handlePointerUp = useCallback(
		(e: React.PointerEvent) => {
			const session = dragSessionRef.current;
			if (!session || session.pointerId !== e.pointerId) {
				return;
			}

			releasePointerCapture(e.pointerId);
			dragSessionRef.current = null;
			const releasePosition = getDraggedPosition(
				session,
				e.clientX,
				e.clientY,
				window.innerWidth,
				window.innerHeight
			);
			setPosition(releasePosition);

			if (!hasDraggedRef.current) {
				setIsDragging(false);
				return;
			}

			const newCorner = calculateNearestCorner(
				releasePosition.left + session.width / 2,
				releasePosition.top + session.height / 2,
				window.innerWidth,
				window.innerHeight
			);
			const target = getSnappedPosition(
				newCorner,
				session.width,
				session.height,
				cornerOffsetRef.current.horizontal,
				cornerOffsetRef.current.vertical,
				window.innerWidth,
				window.innerHeight
			);

			if (newCorner !== corner) {
				updateCorner(newCorner);
			}
			animateToPosition(target);
		},
		[animateToPosition, corner, releasePointerCapture, updateCorner]
	);

	const handlePointerCancel = useCallback(
		(e: React.PointerEvent) => {
			const session = dragSessionRef.current;
			if (!session || session.pointerId !== e.pointerId) {
				return;
			}

			releasePointerCapture(e.pointerId);
			dragSessionRef.current = null;
			const target = getSnappedPosition(
				corner,
				session.width,
				session.height,
				cornerOffsetRef.current.horizontal,
				cornerOffsetRef.current.vertical,
				window.innerWidth,
				window.innerHeight
			);
			animateToPosition(target);
		},
		[animateToPosition, corner, releasePointerCapture]
	);

	useEffect(() => {
		const handleResize = () => {
			const element = elementRef.current;
			if (!coordinateModeRef.current || !element || dragSessionRef.current) {
				return;
			}

			const rect = element.getBoundingClientRect();
			setPosition(
				getSnappedPosition(
					corner,
					rect.width,
					rect.height,
					cornerOffsetRef.current.horizontal,
					cornerOffsetRef.current.vertical,
					window.innerWidth,
					window.innerHeight
				)
			);
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [corner]);

	useEffect(() => clearSnapAnimation, [clearSnapAnimation]);

	const dragStyle: React.CSSProperties = position
		? {
				left: position.left,
				top: position.top,
				right: 'auto',
				bottom: 'auto',
				...(isDragging ? { transition: 'none' } : {}),
			}
		: {};

	// Function to check if the last interaction was a drag
	const wasDragged = useCallback(() => hasDraggedRef.current, []);

	return {
		corner,
		isDragging,
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
