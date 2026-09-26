/**
 * Switch class names backed by the class map the React `Switch` uses. The
 * size and disabled looks come from `data-size` and `data-disabled` on the
 * root, as in React, so the two frameworks emit the same classes. Vue loads
 * the switch rules through the explicit stylesheet import below instead of
 * the aggregated stylesheet; the class map itself carries no CSS.
 */
import styles from '@c15t/ui/styles/components/switch';

import '@c15t/ui/styles/components/switch.css';

const withClass = (base: string, options?: { class?: string }) =>
	[base, options?.class].filter(Boolean).join(' ');

export const switchVariants = () => ({
	root: (options?: { class?: string }) => withClass(styles.root, options),
	thumb: (options?: { class?: string }) => withClass(styles.thumb, options),
	track: (options?: { class?: string }) => withClass(styles.track, options),
});
