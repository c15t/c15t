import styles from './collapsible.module.css';

export interface CollapsibleVariantsProps {}

export const collapsibleVariants = () => {
	return {
		root: (options?: { class?: string }) =>
			[styles.root, options?.class].filter(Boolean).join(' '),
		trigger: (options?: { class?: string }) =>
			[styles.trigger, options?.class].filter(Boolean).join(' '),
		content: (options?: { class?: string }) =>
			[styles.content, options?.class].filter(Boolean).join(' '),
		contentViewport: (options?: { class?: string }) =>
			[styles.contentViewport, options?.class].filter(Boolean).join(' '),
		contentInner: (options?: { class?: string }) =>
			[styles.contentInner, options?.class].filter(Boolean).join(' '),
	};
};
