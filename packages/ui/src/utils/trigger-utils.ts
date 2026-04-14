/**
 * Framework-agnostic utilities for the PreferenceCenterTrigger component.
 *
 * These utilities handle corner position calculations, drag state management,
 * and position persistence - all without any framework-specific dependencies.
 *
 * @packageDocumentation
 */

/**
 * Corner position options for the trigger button.
 * The button can be positioned in any of the four viewport corners.
 */
export type CornerPosition =
	| 'bottom-right'
	| 'top-right'
	| 'bottom-left'
	| 'top-left';

/**
 * State representing an ongoing drag operation.
 */
export interface DragState {
	/** Whether a drag operation is currently in progress */
	isDragging: boolean;
	/** X coordinate where the drag started */
	startX: number;
	/** Y coordinate where the drag started */
	startY: number;
	/** Current X coordinate during drag */
	currentX: number;
	/** Current Y coordinate during drag */
	currentY: number;
}

/**
 * Configuration options for the trigger positioning utilities.
 */
export interface TriggerConfig {
	/** Default corner position */
	defaultPosition: CornerPosition;
	/** Offset from viewport edges in pixels */
	offset: number;
	/** Whether to persist position to localStorage */
	persistPosition: boolean;
	/** Storage key for position persistence */
	storageKey: string;
}

/**
 * Default configuration values for the trigger.
 */
export const DEFAULT_TRIGGER_CONFIG: TriggerConfig = {
	defaultPosition: 'bottom-right',
	offset: 20,
	persistPosition: true,
	storageKey: 'c15t-trigger-position',
};

/**
 * Minimum drag distance in pixels to trigger a corner change.
 * A small drag threshold makes the trigger feel more responsive.
 */
export const DRAG_THRESHOLD = 30;

/**
 * Minimum velocity (pixels/ms) to trigger a corner change.
 * Fast swipes should trigger even with smaller distances.
 */
export const VELOCITY_THRESHOLD = 0.15;

/**
 * Calculates which corner is nearest to the given coordinates.
 *
 * @param x - Current X coordinate (relative to viewport)
 * @param y - Current Y coordinate (relative to viewport)
 * @param viewportWidth - Width of the viewport
 * @param viewportHeight - Height of the viewport
 * @returns The nearest corner position
 *
 * @example
 * ```typescript
 * // Bottom-right corner of a 1920x1080 viewport
 * const corner = calculateNearestCorner(1500, 900, 1920, 1080);
 * // Returns: 'bottom-right'
 * ```
 */
export function calculateNearestCorner(
	x: number,
	y: number,
	viewportWidth: number,
	viewportHeight: number
): CornerPosition {
	const isRight = x > viewportWidth / 2;
	const isBottom = y > viewportHeight / 2;

	if (isBottom && isRight) {
		return 'bottom-right';
	}
	if (isBottom && !isRight) {
		return 'bottom-left';
	}
	if (!isBottom && isRight) {
		return 'top-right';
	}
	return 'top-left';
}

/**
 * Calculates the new corner based on drag direction from the current corner.
 * A small drag in any direction will snap to the appropriate corner.
 * Fast swipes (high velocity) can trigger with smaller distances.
 *
 * @param currentCorner - The current corner position
 * @param dragX - Horizontal drag distance (positive = right, negative = left)
 * @param dragY - Vertical drag distance (positive = down, negative = up)
 * @param options - Optional configuration
 * @param options.threshold - Minimum drag distance to trigger a change (default: DRAG_THRESHOLD)
 * @param options.velocityX - Horizontal velocity in pixels/ms (optional)
 * @param options.velocityY - Vertical velocity in pixels/ms (optional)
 * @returns The new corner position based on drag direction
 *
 * @example
 * ```typescript
 * // Dragging left from bottom-right
 * const corner = calculateCornerFromDrag('bottom-right', -50, 0);
 * // Returns: 'bottom-left'
 *
 * // Fast swipe with velocity
 * const corner = calculateCornerFromDrag('bottom-right', -15, 0, {
 *   velocityX: 0.5, velocityY: 0
 * });
 * // Returns: 'bottom-left' (velocity overcomes small distance)
 * ```
 */
export function calculateCornerFromDrag(
	currentCorner: CornerPosition,
	dragX: number,
	dragY: number,
	options: {
		threshold?: number;
		velocityX?: number;
		velocityY?: number;
	} = {}
): CornerPosition {
	const { threshold = DRAG_THRESHOLD, velocityX = 0, velocityY = 0 } = options;

	// Determine the dominant direction of the drag
	const absDragX = Math.abs(dragX);
	const absDragY = Math.abs(dragY);
	const absVelocityX = Math.abs(velocityX);
	const absVelocityY = Math.abs(velocityY);

	// Check if velocity exceeds threshold (fast swipe)
	const hasVelocityX = absVelocityX >= VELOCITY_THRESHOLD;
	const hasVelocityY = absVelocityY >= VELOCITY_THRESHOLD;

	// For velocity-based movement, use a much smaller distance threshold
	const velocityDistanceThreshold = 10;

	// Determine if we should move in each direction
	const shouldMoveX =
		absDragX >= threshold ||
		(hasVelocityX && absDragX >= velocityDistanceThreshold);
	const shouldMoveY =
		absDragY >= threshold ||
		(hasVelocityY && absDragY >= velocityDistanceThreshold);

	// If no movement threshold met, stay in current corner
	if (!shouldMoveX && !shouldMoveY) {
		return currentCorner;
	}

	// Parse current corner state
	const isCurrentlyBottom = currentCorner.includes('bottom');
	const isCurrentlyRight = currentCorner.includes('right');

	// Calculate new position based on drag direction
	let isBottom = isCurrentlyBottom;
	let isRight = isCurrentlyRight;

	// Horizontal movement
	if (shouldMoveX) {
		isRight = dragX > 0;
	}

	// Vertical movement
	if (shouldMoveY) {
		isBottom = dragY > 0;
	}

	// Build the new corner
	if (isBottom && isRight) {
		return 'bottom-right';
	}
	if (isBottom && !isRight) {
		return 'bottom-left';
	}
	if (!isBottom && isRight) {
		return 'top-right';
	}
	return 'top-left';
}

/**
 * Gets CSS position properties for placing an element at a corner.
 *
 * @param corner - The corner to position at
 * @param offset - Distance from viewport edges in pixels
 * @returns Object with CSS position properties (top/bottom and left/right)
 *
 * @example
 * ```typescript
 * const styles = getCornerStyles('bottom-right', 16);
 * // Returns: { bottom: '16px', right: '16px' }
 * ```
 */
export function getCornerStyles(
	corner: CornerPosition,
	offset = 16
): Record<string, string | undefined> {
	const styles: Record<string, string | undefined> = {};

	if (corner.includes('bottom')) {
		styles.bottom = `${offset}px`;
		styles.top = undefined;
	} else {
		styles.top = `${offset}px`;
		styles.bottom = undefined;
	}

	if (corner.includes('right')) {
		styles.right = `${offset}px`;
		styles.left = undefined;
	} else {
		styles.left = `${offset}px`;
		styles.right = undefined;
	}

	return styles;
}

/**
 * Persists the trigger position to localStorage.
 *
 * @param corner - The corner position to persist
 * @param storageKey - The localStorage key to use
 *
 * @remarks
 * Silently fails if localStorage is not available (e.g., in SSR or private browsing).
 */
export function persistPosition(
	corner: CornerPosition,
	storageKey: string = DEFAULT_TRIGGER_CONFIG.storageKey
): void {
	try {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(storageKey, corner);
		}
	} catch {
		// Silently fail - localStorage may not be available
	}
}

/**
 * Retrieves the persisted trigger position from localStorage.
 *
 * @param storageKey - The localStorage key to read from
 * @returns The persisted corner position, or null if not found/invalid
 *
 * @remarks
 * Returns null if localStorage is not available or the stored value is invalid.
 */
export function getPersistedPosition(
	storageKey: string = DEFAULT_TRIGGER_CONFIG.storageKey
): CornerPosition | null {
	try {
		if (typeof localStorage !== 'undefined') {
			const stored = localStorage.getItem(storageKey);
			if (
				stored === 'bottom-right' ||
				stored === 'top-right' ||
				stored === 'bottom-left' ||
				stored === 'top-left'
			) {
				return stored;
			}
		}
	} catch {
		// Silently fail - localStorage may not be available
	}
	return null;
}

/**
 * Creates an initial drag state object.
 *
 * @returns A DragState with isDragging false and all coordinates at 0
 */
export function createInitialDragState(): DragState {
	return {
		isDragging: false,
		startX: 0,
		startY: 0,
		currentX: 0,
		currentY: 0,
	};
}

/**
 * Calculates the transform offset during a drag operation.
 *
 * @param dragState - The current drag state
 * @returns Object with x and y pixel offsets for CSS transform
 *
 * @example
 * ```typescript
 * const offset = calculateDragOffset(dragState);
 * // Use in style: transform: translate(${offset.x}px, ${offset.y}px)
 * ```
 */
export function calculateDragOffset(dragState: DragState): {
	x: number;
	y: number;
} {
	if (!dragState.isDragging) {
		return { x: 0, y: 0 };
	}
	return {
		x: dragState.currentX - dragState.startX,
		y: dragState.currentY - dragState.startY,
	};
}
