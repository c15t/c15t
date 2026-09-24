/**
 * Switch class names backed by the class map the React `Switch` uses. The
 * size and disabled looks come from `data-size` and `data-disabled` on the
 * root, as in React, so the two frameworks emit the same classes and the
 * CSS arrives with the class map instead of the aggregated stylesheet.
 */
import styles from '@c15t/ui/styles/components/switch';

const withClass = (base: string, options?: { class?: string }) =>
	[base, options?.class].filter(Boolean).join(' ');

export const switchVariants = () => ({
	root: (options?: { class?: string }) => withClass(styles.root, options),
	thumb: (options?: { class?: string }) => withClass(styles.thumb, options),
	track: (options?: { class?: string }) => withClass(styles.track, options),
});
