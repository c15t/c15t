import styles from './preference-item.module.css';

export interface PreferenceItemVariantsProps {}

export const preferenceItemVariants = () => {
	return {
		auxiliary: (options?: { class?: string }) =>
			[styles.auxiliary, options?.class].filter(Boolean).join(' '),
		content: (options?: { class?: string }) =>
			[styles.content, options?.class].filter(Boolean).join(' '),
		contentInner: (options?: { class?: string }) =>
			[styles.contentInner, options?.class].filter(Boolean).join(' '),
		contentViewport: (options?: { class?: string }) =>
			[styles.contentViewport, options?.class].filter(Boolean).join(' '),
		control: (options?: { class?: string }) =>
			[styles.control, options?.class].filter(Boolean).join(' '),
		header: (options?: { class?: string }) =>
			[styles.header, options?.class].filter(Boolean).join(' '),
		leading: (options?: { class?: string }) =>
			[styles.leading, options?.class].filter(Boolean).join(' '),
		meta: (options?: { class?: string }) =>
			[styles.meta, options?.class].filter(Boolean).join(' '),
		root: (options?: { class?: string }) =>
			[styles.root, options?.class].filter(Boolean).join(' '),
		title: (options?: { class?: string }) =>
			[styles.title, options?.class].filter(Boolean).join(' '),
		trigger: (options?: { class?: string }) =>
			[styles.trigger, options?.class].filter(Boolean).join(' '),
	};
};
