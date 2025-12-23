import styles from './cookie-banner.module.css';

/**
 * CSS Module exports for cookie-banner component styles
 *
 * @description Provides typed access to CSS class names for the cookie banner component.
 * Each property maps to a CSS class defined in the corresponding CSS module file.
 *
 * @example
 * ```tsx
 * import styles from '@c15t/styles/components/cookie-banner.module';
 *
 * <div className={styles.root}>
 *   <div className={styles.card}>
 *     <header className={styles.header}>
 *       <h2 className={styles.title}>Cookie Notice</h2>
 *       <p className={styles.description}>We use cookies...</p>
 *     </header>
 *   </div>
 * </div>
 * ```
 */
export const cookieBannerStyles = {
	/**
	 * Root container for the cookie banner
	 * @description Main wrapper element that positions the banner on the page
	 * @example className={styles.root}
	 */
	root: styles.root,

	/**
	 * Visible state animation class for the banner
	 * @description Applied when the banner should be visible with entrance animation
	 * @example className={isVisible ? styles.bannerVisible : styles.bannerHidden}
	 */
	bannerVisible: styles.bannerVisible,

	/**
	 * Hidden state animation class for the banner
	 * @description Applied when the banner should be hidden with exit animation
	 * @example className={isVisible ? styles.bannerVisible : styles.bannerHidden}
	 */
	bannerHidden: styles.bannerHidden,

	/**
	 * Bottom-left positioning variant
	 * @description Positions the banner at the bottom-left corner of the viewport
	 * @example className={`${styles.root} ${styles.bottomLeft}`}
	 */
	bottomLeft: styles.bottomLeft,

	/**
	 * Bottom-right positioning variant
	 * @description Positions the banner at the bottom-right corner of the viewport
	 * @example className={`${styles.root} ${styles.bottomRight}`}
	 */
	bottomRight: styles.bottomRight,

	/**
	 * Top-left positioning variant
	 * @description Positions the banner at the top-left corner of the viewport
	 * @example className={`${styles.root} ${styles.topLeft}`}
	 */
	topLeft: styles.topLeft,

	/**
	 * Top-right positioning variant
	 * @description Positions the banner at the top-right corner of the viewport
	 * @example className={`${styles.root} ${styles.topRight}`}
	 */
	topRight: styles.topRight,

	/**
	 * Main card container for banner content
	 * @description Styled container that holds all banner content with background, border, and shadow
	 * @example <div className={styles.card}>Banner content</div>
	 */
	card: styles.card,

	/**
	 * Reject button styling
	 * @description CSS class for the "Reject All" button styling
	 * @example <button className={styles.rejectButton}>Reject All</button>
	 */
	rejectButton: styles.rejectButton,

	/**
	 * Accept button styling
	 * @description CSS class for the "Accept All" button styling
	 * @example <button className={styles.acceptButton}>Accept All</button>
	 */
	acceptButton: styles.acceptButton,

	/**
	 * Customize button styling
	 * @description CSS class for the "Customize" button styling
	 * @example <button className={styles.customizeButton}>Customize</button>
	 */
	customizeButton: styles.customizeButton,

	/**
	 * Header section container
	 * @description Container for the banner's title and description
	 * @example <header className={styles.header}>Title and description</header>
	 */
	header: styles.header,

	/**
	 * Footer section container
	 * @description Container for action buttons and additional footer content
	 * @example <footer className={styles.footer}>Action buttons</footer>
	 */
	footer: styles.footer,

	/**
	 * Footer button group container
	 * @description Groups related action buttons together (accept/reject)
	 * @example <div className={styles.footerSubGroup}>Accept and Reject buttons</div>
	 */
	footerSubGroup: styles.footerSubGroup,

	/**
	 * Description text styling
	 * @description Styling for the banner's descriptive text explaining cookie usage
	 * @example <p className={styles.description}>We use cookies to...</p>
	 */
	description: styles.description,

	/**
	 * Title text styling
	 * @description Styling for the banner's main title/heading
	 * @example <h2 className={styles.title}>Cookie Notice</h2>
	 */
	title: styles.title,

	/**
	 * Background overlay styling
	 * @description Semi-transparent backdrop that covers the page behind the banner
	 * @example <div className={styles.overlay} />
	 */
	overlay: styles.overlay,

	/**
	 * Visible state for overlay animation
	 * @description Applied when the overlay should be visible with fade-in animation
	 * @example className={isVisible ? styles.overlayVisible : styles.overlayHidden}
	 */
	overlayVisible: styles.overlayVisible,

	/**
	 * Hidden state for overlay animation
	 * @description Applied when the overlay should be hidden with fade-out animation
	 * @example className={isVisible ? styles.overlayVisible : styles.overlayHidden}
	 */
	overlayHidden: styles.overlayHidden,
};

export default cookieBannerStyles;
