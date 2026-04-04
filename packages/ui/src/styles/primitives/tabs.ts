import styles from './tabs.module.css';

export type TabsOrientation = 'horizontal' | 'vertical';

export interface TabsVariantsProps {
	orientation?: TabsOrientation;
}

export const tabsVariants = ({
	orientation = 'horizontal',
}: TabsVariantsProps = {}) => {
	return {
		root: (options?: { class?: string }) =>
			[styles.root, options?.class].filter(Boolean).join(' '),
		list: (options?: { class?: string }) =>
			[
				styles.list,
				orientation === 'vertical' ? styles['list-vertical'] : undefined,
				options?.class,
			]
				.filter(Boolean)
				.join(' '),
		trigger: (options?: { class?: string }) =>
			[styles.trigger, options?.class].filter(Boolean).join(' '),
		content: (options?: { class?: string }) =>
			[styles.content, options?.class].filter(Boolean).join(' '),
	};
};
