import { useCallback, useLayoutEffect, useRef } from 'react';
import { useDragContext } from './drag-context';

/**
 * Position type representing x and y coordinates
 */
interface Point {
	x: number;
	y: number;
}

/**
 * Corner position type
 */
export type Corners = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Corner with translation information
 */
interface Corner {
	corner: Corners;
	translation: Point;
}

/**
 * Draggable component properties
 */
interface DraggableProps {
	avoidZone?: {
		corner: Corners;
		padding: number;
		square: number;
	};
	children: React.ReactElement;
	disableDrag?: boolean;
	dragHandleSelector?: string;
	onDragStart?: () => void;
	padding: number;
	position: Corners;
	setPosition: (position: Corners) => void;
	style?: React.CSSProperties;
}

/**
 * Draggable component that allows dragging an element to different corners
 *
 * @param children - The child element to make draggable
 * @param padding - The padding from the viewport edges
 * @param position - The current corner position
 * @param setPosition - Callback to update the position
 * @param onDragStart - Optional callback when drag starts
 * @param dragHandleSelector - Optional CSS selector for drag handles
 * @param disableDrag - Whether dragging is disabled
 * @param avoidZone - Optional zone to avoid when positioning
 * @param props - Additional div attributes
 */
export function Draggable({
	avoidZone,
	children,
	disableDrag = false,
	dragHandleSelector,
	onDragStart,
	padding,
	position: currentCorner,
	setPosition: setCurrentCorner,
	...props
}: DraggableProps) {
	const { ref, animate, ...drag } = useDrag({
		disabled: disableDrag,
		dragHandleSelector,
		handles: useDragContext()?.handles,
		onAnimationEnd,
		onDragEnd,
		onDragStart,
		threshold: 5,
	});

	function onDragEnd(translation: Point, velocity: Point) {
		const distance = Math.sqrt(
			translation.x * translation.x + translation.y * translation.y
		);
		if (distance === 0) {
			ref.current?.style.removeProperty('translate');
			return;
		}

		const projectedPosition = {
			x: translation.x + project(velocity.x),
			y: translation.y + project(velocity.y),
		};
		const nearestCorner = getNearestCorner(projectedPosition);
		animate(nearestCorner);
	}

	function onAnimationEnd({ corner }: Corner) {
		setTimeout(() => {
			ref.current?.style.removeProperty('translate');
			setCurrentCorner(corner);
		});
	}

	function getNearestCorner({ x, y }: Point): Corner {
		const allCorners = getCorners();
		const distances = Object.entries(allCorners).map(([key, translation]) => {
			const distance = Math.sqrt(
				(x - translation.x) ** 2 + (y - translation.y) ** 2
			);
			return { distance, key };
		});
		const min = Math.min(...distances.map((d) => d.distance));
		const nearest = distances.find((d) => d.distance === min);
		if (!nearest) {
			// this should be guarded by an invariant, shouldn't ever happen
			return { corner: currentCorner, translation: allCorners[currentCorner] };
		}
		return {
			corner: nearest.key as Corners,
			translation: allCorners[nearest.key as Corners],
		};
	}

	function getCorners(): Record<Corners, Point> {
		const offset = padding * 2;
		const triggerWidth = ref.current?.offsetWidth || 0;
		const triggerHeight = ref.current?.offsetHeight || 0;
		const scrollbarWidth =
			window.innerWidth - document.documentElement.clientWidth;

		function getAbsolutePosition(corner: Corners) {
			const isRight = corner.includes('right');
			const isBottom = corner.includes('bottom');

			// Base positions flush against the chosen corner
			const x = isRight
				? window.innerWidth - scrollbarWidth - offset - triggerWidth
				: 0;
			const y = isBottom ? window.innerHeight - offset - triggerHeight : 0;

			// Apply avoidZone offset if this corner is occupied. We only move along
			// the vertical axis to keep the panel within the viewport. For bottom
			// corners we move the panel up, for top corners we move it down.
			if (avoidZone && avoidZone.corner === corner) {
				const delta = avoidZone.square + avoidZone.padding;
				if (isBottom) {
					// move up
					return { x, y: y - delta };
				}
				// move down
				return { x, y: y + delta };
			}

			return { x, y };
		}

		const basePosition = getAbsolutePosition(currentCorner);

		function rel(pos: Point): Point {
			return {
				x: pos.x - basePosition.x,
				y: pos.y - basePosition.y,
			};
		}

		return {
			'bottom-left': rel(getAbsolutePosition('bottom-left')),
			'bottom-right': rel(getAbsolutePosition('bottom-right')),
			'top-left': rel(getAbsolutePosition('top-left')),
			'top-right': rel(getAbsolutePosition('top-right')),
		};
	}

	return (
		<div
			{...props}
			ref={ref}
			{...drag}
			style={{
				WebkitUserSelect: 'none',
				touchAction: 'none',
				userSelect: 'none',
				...props.style,
			}}
		>
			{children}
		</div>
	);
}

/**
 * Options for the useDrag hook
 */
interface UseDragOptions {
	disabled: boolean;
	dragHandleSelector?: string;
	handles?: Set<HTMLElement>;
	onAnimationEnd?: (corner: Corner) => void;
	onDrag?: (translation: Point) => void;
	onDragEnd?: (translation: Point, velocity: Point) => void;
	onDragStart?: () => void;
	threshold: number; // Minimum movement before drag starts
}

/**
 * Velocity tracking information
 */
interface Velocity {
	position: Point;
	timestamp: number;
}

/**
 * Hook that implements drag behavior
 *
 * @param options - Configuration options for drag behavior
 * @returns Object with ref, animate function, and drag event handlers
 */
function useDrag(options: UseDragOptions) {
	const ref = useRef<HTMLDivElement>(null);
	const machine = useRef<
		| { state: 'idle' | 'press' | 'drag-end' }
		| { pointerId: number; state: 'drag' }
	>({
		state: 'idle',
	});
	const cleanup = useRef<(() => void) | null>(null);

	const origin = useRef<Point>({ x: 0, y: 0 });
	const translation = useRef<Point>({ x: 0, y: 0 });
	const lastTimestamp = useRef(0);
	const velocities = useRef<Velocity[]>([]);

	const cancel = useCallback(() => {
		if (machine.current.state === 'drag') {
			ref.current?.releasePointerCapture(machine.current.pointerId);
		}

		machine.current =
			machine.current.state === 'drag'
				? { state: 'drag-end' }
				: { state: 'idle' };

		if (cleanup.current !== null) {
			cleanup.current();
			cleanup.current = null;
		}

		velocities.current = [];

		ref.current?.classList.remove('dev-tools-grabbing');
		document.body.style.removeProperty('user-select');
		document.body.style.removeProperty('-webkit-user-select');
	}, []);

	useLayoutEffect(() => {
		if (options.disabled) {
			cancel();
		}
	}, [cancel, options.disabled]);

	function set(position: Point) {
		if (ref.current) {
			translation.current = position;
			ref.current.style.translate = `${position.x}px ${position.y}px`;
		}
	}

	function animate(corner: Corner) {
		const el = ref.current;
		if (el === null) {
			return;
		}

		function listener(e: TransitionEvent) {
			if (e.propertyName === 'translate' && el) {
				options.onAnimationEnd?.(corner);
				translation.current = { x: 0, y: 0 };
				el.style.transition = '';
				el.removeEventListener('transitionend', listener);
			}
		}

		// Generated from https://www.easing.dev/spring
		el.style.transition =
			'translate 491.22ms cubic-bezier(0.34, 1.56, 0.64, 1)';
		el.addEventListener('transitionend', listener);
		set(corner.translation);
	}

	function onClick(e: MouseEvent) {
		if (machine.current.state === 'drag-end') {
			e.preventDefault();
			e.stopPropagation();
			machine.current = { state: 'idle' };
			ref.current?.removeEventListener('click', onClick);
		}
	}

	function isValidDragHandle(target: EventTarget | null): boolean {
		if (!target || !ref.current) {
			return true;
		}

		if (options.handles && options.handles.size > 0) {
			let node: HTMLElement | null = target as HTMLElement;
			while (node && node !== ref.current) {
				if (options.handles.has(node)) {
					return true;
				}
				node = node.parentElement;
			}
			return false;
		}

		if (options.dragHandleSelector) {
			const element = target as Element;
			return element.closest(options.dragHandleSelector) !== null;
		}

		return true;
	}

	function onPointerDown(e: React.PointerEvent) {
		if (e.button !== 0) {
			return; // ignore right click
		}

		// Check if the pointer down event is on a valid drag handle
		if (!isValidDragHandle(e.target)) {
			return;
		}

		origin.current = { x: e.clientX, y: e.clientY };
		machine.current = { state: 'press' };
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);

		if (cleanup.current !== null) {
			cleanup.current();
			cleanup.current = null;
		}
		cleanup.current = () => {
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
		};

		ref.current?.addEventListener('click', onClick);
	}

	function onPointerMove(e: PointerEvent) {
		if (machine.current.state === 'press') {
			const dx = e.clientX - origin.current.x;
			const dy = e.clientY - origin.current.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance >= options.threshold) {
				machine.current = { pointerId: e.pointerId, state: 'drag' };
				ref.current?.setPointerCapture(e.pointerId);
				ref.current?.classList.add('dev-tools-grabbing');
				document.body.style.userSelect = 'none';
				document.body.style.webkitUserSelect = 'none';
				options.onDragStart?.();
			}
		}

		if (machine.current.state !== 'drag') {
			return;
		}

		const currentPosition = { x: e.clientX, y: e.clientY };

		const dx = currentPosition.x - origin.current.x;
		const dy = currentPosition.y - origin.current.y;
		origin.current = currentPosition;

		const newTranslation = {
			x: translation.current.x + dx,
			y: translation.current.y + dy,
		};

		set(newTranslation);

		// Keep a history of recent positions for velocity calculation
		// Only store points that are at least 10ms apart to avoid too many samples
		const now = Date.now();
		const shouldAddToHistory = now - lastTimestamp.current >= 10;
		if (shouldAddToHistory) {
			velocities.current = [
				...velocities.current.slice(-5),
				{ position: currentPosition, timestamp: now },
			];
		}

		lastTimestamp.current = now;
		options.onDrag?.(translation.current);
	}

	function onPointerUp() {
		const velocity = calculateVelocity(velocities.current);

		cancel();

		options.onDragEnd?.(translation.current, velocity);
	}

	if (options.disabled) {
		return {
			animate,
			ref,
		};
	}

	return {
		animate,
		onPointerDown,
		ref,
	};
}

/**
 * Calculates velocity from position history
 *
 * @param history - Array of position and timestamp pairs
 * @returns Velocity as pixels per second in x and y directions
 */
function calculateVelocity(
	history: Array<{ position: Point; timestamp: number }>
): Point {
	if (history.length < 2) {
		return { x: 0, y: 0 };
	}

	const oldestPoint = history[0];
	const latestPoint = history[history.length - 1];

	if (!oldestPoint || !latestPoint) {
		return { x: 0, y: 0 };
	}

	const timeDelta = latestPoint.timestamp - oldestPoint.timestamp;

	if (timeDelta === 0) {
		return { x: 0, y: 0 };
	}

	// Calculate pixels per millisecond
	const velocityX =
		(latestPoint.position.x - oldestPoint.position.x) / timeDelta;
	const velocityY =
		(latestPoint.position.y - oldestPoint.position.y) / timeDelta;

	// Convert to pixels per second for more intuitive values
	return {
		x: velocityX * 1000,
		y: velocityY * 1000,
	};
}

/**
 * Projects future position based on velocity and deceleration
 *
 * @param initialVelocity - Initial velocity in pixels per second
 * @param decelerationRate - Rate of deceleration (default 0.999)
 * @returns Projected distance
 */
function project(initialVelocity: number, decelerationRate = 0.999) {
	return ((initialVelocity / 1000) * decelerationRate) / (1 - decelerationRate);
}
