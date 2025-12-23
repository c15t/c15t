import styles from './frame.module.css';

/**
 * CSS Module exports for frame component styles
 *
 * @description Provides typed access to CSS class names for the frame component.
 * Each property maps to a CSS class defined in the corresponding CSS module file.
 *
 * @example
 * ```tsx
 * import { frameStyles } from '@c15t/styles/components/frame';
 *
 * <div className={frameStyles.placeholder}>
 *   <h2 className={frameStyles.title}>Frame Title</h2>
 * </div>
 * ```
 */
export const frameStyles = {
	/**
	 * Placeholder container styling
	 * @description Main container for the frame placeholder with fade-in animation
	 * @example className={frameStyles.placeholder}
	 */
	placeholder: styles.placeholder,

	/**
	 * Title text styling
	 * @description Styling for the frame's title/heading element
	 * @example <h2 className={frameStyles.title}>Frame Title</h2>
	 */
	title: styles.title,
};

export default frameStyles;
