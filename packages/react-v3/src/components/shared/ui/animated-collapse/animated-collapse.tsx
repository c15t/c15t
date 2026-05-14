'use client';

import {
	type FC,
	type ReactNode,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';

/**
 * Props for the AnimatedCollapse component.
 * @public
 */
export interface AnimatedCollapseProps {
	/**
	 * Whether the content is expanded (visible) or collapsed (hidden).
	 */
	isOpen: boolean;

	/**
	 * The content to show/hide with animation.
	 * Content is always rendered to allow accurate height measurement.
	 */
	children: ReactNode;

	/**
	 * Duration of the animation in milliseconds.
	 * @default 250
	 */
	duration?: number;

	/**
	 * CSS easing function for the animation.
	 * @default 'cubic-bezier(0.33, 1, 0.68, 1)'
	 */
	easing?: string;

	/**
	 * Optional className for the wrapper element.
	 */
	className?: string;
}

/**
 * AnimatedCollapse - Smooth height animation for collapsible content.
 *
 * @remarks
 * Uses a two-layer wrapper pattern:
 * - Outer wrapper handles ONLY height/overflow animation
 * - Children handle their own padding/margin/border styling
 *
 * This prevents style conflicts and ensures borders/padding are
 * properly clipped when collapsed.
 *
 * @example
 * ```tsx
 * <AnimatedCollapse isOpen={isExpanded}>
 *   <div className={styles.content}>
 *     Collapsible content with padding and borders
 *   </div>
 * </AnimatedCollapse>
 * ```
 *
 * @public
 */
export const AnimatedCollapse: FC<AnimatedCollapseProps> = ({
	isOpen,
	children,
	duration = 250,
	easing = 'cubic-bezier(0.33, 1, 0.68, 1)',
	className,
}) => {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const animationRef = useRef<number | null>(null);

	// Track if content should be rendered (for mounting/unmounting after animation)
	// Start as true only if isOpen is true
	const [shouldRender, setShouldRender] = useState(isOpen);
	const [isAnimating, setIsAnimating] = useState(false);

	// State for controlling the animation
	const [state, setState] = useState<{
		height: number | 'auto';
		overflow: 'hidden' | 'visible';
		transition: string;
	}>({
		height: isOpen ? 'auto' : 0,
		overflow: isOpen ? 'visible' : 'hidden',
		transition: 'none',
	});

	useLayoutEffect(() => {
		const wrapper = wrapperRef.current;
		const content = contentRef.current;

		// Check for reduced motion preference
		const prefersReducedMotion = window.matchMedia(
			'(prefers-reduced-motion: reduce)'
		).matches;

		if (prefersReducedMotion) {
			setShouldRender(isOpen);
			setIsAnimating(false);
			setState({
				height: isOpen ? 'auto' : 0,
				overflow: isOpen ? 'visible' : 'hidden',
				transition: 'none',
			});
			return;
		}

		// Cancel any pending animation frame
		if (animationRef.current !== null) {
			cancelAnimationFrame(animationRef.current);
		}

		if (isOpen) {
			// Opening: render content first, then animate
			setShouldRender(true);
			setIsAnimating(true);

			// Wait for content to render before measuring
			animationRef.current = requestAnimationFrame(() => {
				const measuredContent = contentRef.current;
				if (!measuredContent) {
					setIsAnimating(false);
					return;
				}

				const naturalHeight = measuredContent.scrollHeight;

				// Start from 0
				setState({
					height: 0,
					overflow: 'hidden',
					transition: 'none',
				});

				// Animate to natural height
				requestAnimationFrame(() => {
					setState({
						height: naturalHeight,
						overflow: 'hidden',
						transition: `height ${duration}ms ${easing}`,
					});

					// After animation, set to auto
					const handleTransitionEnd = (e: TransitionEvent) => {
						if (e.propertyName !== 'height') {
							return;
						}
						setState({
							height: 'auto',
							overflow: 'visible',
							transition: 'none',
						});
						setIsAnimating(false);
						wrapper?.removeEventListener('transitionend', handleTransitionEnd);
					};

					wrapper?.addEventListener('transitionend', handleTransitionEnd);
				});
			});
		} else {
			// Closing: animate first, then unmount content
			if (!wrapper || !content) {
				setShouldRender(false);
				setIsAnimating(false);
				setState({
					height: 0,
					overflow: 'hidden',
					transition: 'none',
				});
				return;
			}

			setIsAnimating(true);
			const currentHeight = content.scrollHeight;

			// Set explicit height
			setState({
				height: currentHeight,
				overflow: 'hidden',
				transition: 'none',
			});

			// Animate to 0
			animationRef.current = requestAnimationFrame(() => {
				wrapper.offsetHeight; // Force reflow

				setState({
					height: 0,
					overflow: 'hidden',
					transition: `height ${duration}ms ${easing}`,
				});

				// After animation completes, unmount content
				const handleTransitionEnd = (e: TransitionEvent) => {
					if (e.propertyName !== 'height') {
						return;
					}
					setShouldRender(false);
					setIsAnimating(false);
					wrapper.removeEventListener('transitionend', handleTransitionEnd);
				};

				wrapper.addEventListener('transitionend', handleTransitionEnd);
			});
		}

		return () => {
			if (animationRef.current !== null) {
				cancelAnimationFrame(animationRef.current);
			}
		};
	}, [isOpen, duration, easing]);

	// Don't render anything when closed and not animating
	if (!isOpen && !shouldRender && !isAnimating) {
		return null;
	}

	return (
		<div
			ref={wrapperRef}
			className={className}
			style={{
				height: state.height,
				overflow: state.overflow,
				transition: state.transition,
			}}
		>
			{shouldRender && (
				<div ref={contentRef} style={{ overflow: 'hidden' }}>
					{children}
				</div>
			)}
		</div>
	);
};

AnimatedCollapse.displayName = 'AnimatedCollapse';
