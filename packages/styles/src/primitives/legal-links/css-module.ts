import styles from './legal-links.module.css';

/**
 * CSS Module exports for legal-links component styles
 *
 * @description Provides typed access to CSS class names for the legal links component.
 * Each property maps to a CSS class defined in the corresponding CSS module file.
 *
 * @example
 * ```tsx
 * import { legalLinksStyles } from '@c15t/styles/primitives/legal-links';
 *
 * <div className={legalLinksStyles.legalLinks}>
 *   <a href="/privacy" className={legalLinksStyles.legalLink}>Privacy Policy</a>
 *   <a href="/terms" className={legalLinksStyles.legalLink}>Terms of Service</a>
 * </div>
 * ```
 */
export const legalLinksStyles = {
	/**
	 * Container for legal links
	 * @description Flex container that holds and spaces the legal link elements
	 * @example className={legalLinksStyles.legalLinks}
	 */
	legalLinks: styles.legalLinks,

	/**
	 * Individual legal link styling
	 * @description Styling for each legal link with hover and focus states
	 * @example <a className={legalLinksStyles.legalLink} href="/privacy">Privacy Policy</a>
	 */
	legalLink: styles.legalLink,
};

export default legalLinksStyles;
