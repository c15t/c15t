/**
 * Draggable functionality for DevTools button
 * Inlined utilities to avoid dependency issues
 */

const DEVTOOLS_STORAGE_KEY = 'c15t-devtools-position';

/**
 * Corner position options for the draggable button
 */
export type CornerPosition =
	| 'bottom-right'
	| 'top-right'
	| 'bottom-left'
	| 'top-left';

/**
 * State representing an ongoing drag operation
 */
export interface DragState {
	isDragging: boolean;
	startX: number;
	startY: number;
	currentX: number;
	currentY: number;
}

const DRAG_THRESHOLD = 30;
const VELOCITY_THRESHOLD = 0.15;

/**
 * Creates initial drag state
 */
function createInitialDragState(): DragState {
	return {
		isDragging: false,
		startX: 0,
		startY: 0,
		currentX: 0,
		currentY: 0,
	};
}

/**
 * Calculates the new corner based on drag direction
 */
function calculateCornerFromDrag(
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

	const absDragX = Math.abs(dragX);
	const absDragY = Math.abs(dragY);
	const absVelocityX = Math.abs(velocityX);
	const absVelocityY = Math.abs(velocityY);

	const hasVelocityX = absVelocityX >= VELOCITY_THRESHOLD;
	const hasVelocityY = absVelocityY >= VELOCITY_THRESHOLD;

	const velocityDistanceThreshold = 10;

	const shouldMoveX =
		absDragX >= threshold ||
		(hasVelocityX && absDragX >= velocityDistanceThreshold);
	const shouldMoveY =
		absDragY >= threshold ||
		(hasVelocityY && absDragY >= velocityDistanceThreshold);

	if (!shouldMoveX && !shouldMoveY) {
		return currentCorner;
	}

	const isCurrentlyBottom = currentCorner.includes('bottom');
	const isCurrentlyRight = currentCorner.includes('right');

	let isBottom = isCurrentlyBottom;
	let isRight = isCurrentlyRight;

	if (shouldMoveX) {
		isRight = dragX > 0;
	}

	if (shouldMoveY) {
		isBottom = dragY > 0;
	}

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
 * Gets CSS position properties for a corner
 */
function getCornerStyles(
	corner: CornerPosition,
	offset = 20
): Record<string, string> {
	const styles: Record<string, string> = {};

	if (corner.includes('bottom')) {
		styles.bottom = `${offset}px`;
	} else {
		styles.top = `${offset}px`;
	}

	if (corner.includes('right')) {
		styles.right = `${offset}px`;
	} else {
		styles.left = `${offset}px`;
	}

	return styles;
}

/**
 * Persists position to localStorage
 */
function persistPosition(
	corner: CornerPosition,
	storageKey: string = DEVTOOLS_STORAGE_KEY
): void {
	try {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(storageKey, corner);
		}
	} catch {
		// Silently fail
	}
}

/**
 * Gets persisted position from localStorage
 */
function getPersistedPosition(
	storageKey: string = DEVTOOLS_STORAGE_KEY
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
		// Silently fail
	}
	return null;
}

/**
 * Calculates transform offset during drag
 */
function calculateDragOffset(dragState: DragState): { x: number; y: number } {
	if (!dragState.isDragging) {
		return { x: 0, y: 0 };
	}
	return {
		x: dragState.currentX - dragState.startX,
		y: dragState.currentY - dragState.startY,
	};
}

export interface DraggableOptions {
	/**
	 * Default corner position
	 * @default 'bottom-right'
	 */
	defaultPosition?: CornerPosition;

	/**
	 * Whether to persist position to localStorage
	 * @default true
	 */
	persistPosition?: boolean;

	/**
	 * Callback when position changes
	 */
	onPositionChange?: (position: CornerPosition) => void;

	/**
	 * Callback when drag starts
	 */
	onDragStart?: () => void;

	/**
	 * Callback when drag ends
	 */
	onDragEnd?: (wasDragged: boolean) => void;
}

export interface DraggableInstance {
	/**
	 * Get the current corner position
	 */
	getCorner: () => CornerPosition;

	/**
	 * Set the corner position
	 */
	setCorner: (corner: CornerPosition) => void;

	/**
	 * Check if currently dragging
	 */
	isDragging: () => boolean;

	/**
	 * Check if the last interaction was a drag
	 */
	wasDragged: () => boolean;

	/**
	 * Attach drag handlers to an element
	 */
	attach: (element: HTMLElement) => void;

	/**
	 * Detach drag handlers from an element
	 */
	detach: () => void;

	/**
	 * Apply position styles to an element
	 */
	applyPositionStyles: (element: HTMLElement) => void;

	/**
	 * Destroy the instance
	 */
	destroy: () => void;
}

/**
 * Creates a draggable instance for an element
 */
export function createDraggable(
	options: DraggableOptions = {}
): DraggableInstance {
	const {
		defaultPosition = 'bottom-right',
		persistPosition: shouldPersist = true,
		onPositionChange,
		onDragStart,
		onDragEnd,
	} = options;

	// Initialize corner from persisted position or default
	let corner: CornerPosition = defaultPosition;
	if (shouldPersist && typeof window !== 'undefined') {
		const persisted = getPersistedPosition(DEVTOOLS_STORAGE_KEY);
		if (persisted) {
			corner = persisted;
		}
	}

	let dragState: DragState = createInitialDragState();
	let hasDragged = false;
	let dragStartTime = 0;
	let attachedElement: HTMLElement | null = null;

	// Bound event handlers
	let boundPointerDown: ((e: PointerEvent) => void) | null = null;
	let boundPointerMove: ((e: PointerEvent) => void) | null = null;
	let boundPointerUp: ((e: PointerEvent) => void) | null = null;
	let boundPointerCancel: ((e: PointerEvent) => void) | null = null;

	/**
	 * Update corner position
	 */
	function updateCorner(newCorner: CornerPosition): void {
		corner = newCorner;
		if (shouldPersist) {
			persistPosition(newCorner, DEVTOOLS_STORAGE_KEY);
		}
		onPositionChange?.(newCorner);
	}

	/**
	 * Handle pointer down
	 */
	function handlePointerDown(e: PointerEvent): void {
		if (e.button !== 0) {
			return;
		}

		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		hasDragged = false;
		dragStartTime = Date.now();

		dragState = {
			isDragging: true,
			startX: e.clientX,
			startY: e.clientY,
			currentX: e.clientX,
			currentY: e.clientY,
		};

		onDragStart?.();
	}

	/**
	 * Handle pointer move
	 */
	function handlePointerMove(e: PointerEvent): void {
		if (!dragState.isDragging) {
			return;
		}

		const dx = Math.abs(e.clientX - dragState.startX);
		const dy = Math.abs(e.clientY - dragState.startY);
		if (dx > 5 || dy > 5) {
			hasDragged = true;
		}

		dragState = {
			...dragState,
			currentX: e.clientX,
			currentY: e.clientY,
		};

		// Apply transform during drag
		if (attachedElement && hasDragged) {
			const offset = calculateDragOffset(dragState);
			attachedElement.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
			attachedElement.style.transition = 'none';
		}
	}

	/**
	 * Handle pointer up
	 */
	function handlePointerUp(e: PointerEvent): void {
		if (!dragState.isDragging) {
			return;
		}

		(e.target as HTMLElement).releasePointerCapture(e.pointerId);

		if (hasDragged) {
			const dragX = e.clientX - dragState.startX;
			const dragY = e.clientY - dragState.startY;
			const dragDuration = Date.now() - dragStartTime;

			const velocityX = dragDuration > 0 ? dragX / dragDuration : 0;
			const velocityY = dragDuration > 0 ? dragY / dragDuration : 0;

			const newCorner = calculateCornerFromDrag(corner, dragX, dragY, {
				velocityX,
				velocityY,
			});

			if (newCorner !== corner) {
				updateCorner(newCorner);
			}

			// Apply final position
			if (attachedElement) {
				applyPositionStyles(attachedElement);
				attachedElement.style.transform = '';
				attachedElement.style.transition = '';
			}
		}

		dragState = createInitialDragState();
		onDragEnd?.(hasDragged);
	}

	/**
	 * Handle pointer cancel
	 */
	function handlePointerCancel(e: PointerEvent): void {
		(e.target as HTMLElement).releasePointerCapture(e.pointerId);
		dragState = createInitialDragState();

		if (attachedElement) {
			attachedElement.style.transform = '';
			attachedElement.style.transition = '';
		}

		onDragEnd?.(false);
	}

	/**
	 * Apply position styles to an element based on current corner
	 */
	function applyPositionStyles(element: HTMLElement): void {
		const styles = getCornerStyles(corner, 20);

		// Reset all positions first
		element.style.top = '';
		element.style.bottom = '';
		element.style.left = '';
		element.style.right = '';

		// Apply new positions
		for (const [key, value] of Object.entries(styles)) {
			if (value !== undefined) {
				element.style.setProperty(key, value);
			}
		}
	}

	/**
	 * Attach to an element
	 */
	function attach(element: HTMLElement): void {
		detach();

		attachedElement = element;

		boundPointerDown = handlePointerDown;
		boundPointerMove = handlePointerMove;
		boundPointerUp = handlePointerUp;
		boundPointerCancel = handlePointerCancel;

		element.addEventListener('pointerdown', boundPointerDown);
		element.addEventListener('pointermove', boundPointerMove);
		element.addEventListener('pointerup', boundPointerUp);
		element.addEventListener('pointercancel', boundPointerCancel);

		// Apply initial position
		applyPositionStyles(element);

		// Add touch-action for better touch handling
		element.style.touchAction = 'none';
	}

	/**
	 * Detach from the element
	 */
	function detach(): void {
		if (attachedElement) {
			if (boundPointerDown) {
				attachedElement.removeEventListener('pointerdown', boundPointerDown);
			}
			if (boundPointerMove) {
				attachedElement.removeEventListener('pointermove', boundPointerMove);
			}
			if (boundPointerUp) {
				attachedElement.removeEventListener('pointerup', boundPointerUp);
			}
			if (boundPointerCancel) {
				attachedElement.removeEventListener(
					'pointercancel',
					boundPointerCancel
				);
			}
			attachedElement = null;
		}
	}

	return {
		getCorner: () => corner,
		setCorner: updateCorner,
		isDragging: () => dragState.isDragging,
		wasDragged: () => hasDragged,
		attach,
		detach,
		applyPositionStyles,
		destroy: detach,
	};
}
