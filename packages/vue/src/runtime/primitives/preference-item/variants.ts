/**
 * Preference-item class names backed by the same class map the React
 * `PreferenceItem` uses. The explicit stylesheet import below gives a Nuxt
 * app the collapse and header rules without loading the aggregated
 * stylesheet; the class map itself carries no CSS. The
 * `@c15t/ui/styles/primitives` variants map to a stylesheet that only ships
 * in that aggregate.
 */
import styles from '@c15t/ui/styles/components/preference-item';

import '@c15t/ui/styles/components/preference-item.css';

const withClass = (base: string, options?: { class?: string }) =>
	[base, options?.class].filter(Boolean).join(' ');

export const preferenceItemVariants = () => ({
	auxiliary: (options?: { class?: string }) =>
		withClass(styles.auxiliary, options),
	content: (options?: { class?: string }) => withClass(styles.content, options),
	contentInner: (options?: { class?: string }) =>
		withClass(styles.contentInner, options),
	contentViewport: (options?: { class?: string }) =>
		withClass(styles.contentViewport, options),
	control: (options?: { class?: string }) => withClass(styles.control, options),
	header: (options?: { class?: string }) => withClass(styles.header, options),
	leading: (options?: { class?: string }) => withClass(styles.leading, options),
	meta: (options?: { class?: string }) => withClass(styles.meta, options),
	root: (options?: { class?: string }) => withClass(styles.root, options),
	title: (options?: { class?: string }) => withClass(styles.title, options),
	trigger: (options?: { class?: string }) => withClass(styles.trigger, options),
});
