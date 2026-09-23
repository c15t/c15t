/**
 * Preference-item class names backed by the same class map the React
 * `PreferenceItem` uses. Its style entry carries the CSS as a side-effect
 * import, so a Nuxt app gets the collapse and header rules without loading
 * the aggregated stylesheet. The `@c15t/ui/styles/primitives` variants map
 * to a stylesheet that only ships in that aggregate.
 */
import styles from '@c15t/ui/styles/components/preference-item';

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
