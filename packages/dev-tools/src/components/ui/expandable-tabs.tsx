'use client';

import type { LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useEffect, useState } from 'react';
import { cn } from '~/libs/utils';
import styles from './expandable-tabs.module.css';

interface Tab {
	title: string;
	icon: LucideIcon;
	type?: never;
}

interface Separator {
	type: 'separator';
	title?: never;
	icon?: never;
}

type TabItem = Tab | Separator;

interface ExpandableTabsProps {
	tabs: TabItem[];
	className?: string;
	activeColor?: string;
	onChange?: (index: number | null) => void;
}

const buttonVariants = {
	initial: {
		gap: 0,
		paddingLeft: '.5rem',
		paddingRight: '.5rem',
	},
	animate: (isSelected: boolean) => ({
		gap: isSelected ? '.5rem' : 0,
		paddingLeft: isSelected ? '1rem' : '.5rem',
		paddingRight: isSelected ? '1rem' : '.5rem',
	}),
};

const spanVariants = {
	initial: { width: 0, opacity: 0 },
	animate: { width: 'auto', opacity: 1 },
	exit: { width: 0, opacity: 0 },
};

const transition = { delay: 0.1, type: 'spring', bounce: 0, duration: 0.6 };

const Separator = memo(() => (
	<div className={styles.separator} aria-hidden="true" />
));
Separator.displayName = 'Separator';

const TabButton = memo(
	({
		tab,
		index,
		isSelected,
		activeColor,
		onClick,
	}: {
		tab: Tab;
		index: number;
		isSelected: boolean;
		activeColor: string;
		onClick: (index: number) => void;
	}) => {
		const Icon = tab.icon;

		return (
			<motion.button
				variants={buttonVariants}
				initial={false}
				animate="animate"
				custom={isSelected}
				onClick={() => onClick(index)}
				transition={transition}
				className={cn(
					styles.button,
					isSelected && styles.selected,
					isSelected && activeColor === 'primary' && styles.primary
				)}
			>
				<Icon size={20} />
				<AnimatePresence initial={false}>
					{isSelected && (
						<motion.span
							variants={spanVariants}
							initial="initial"
							animate="animate"
							exit="exit"
							transition={transition}
							className={styles.title}
						>
							{tab.title}
						</motion.span>
					)}
				</AnimatePresence>
			</motion.button>
		);
	}
);
TabButton.displayName = 'TabButton';

export function ExpandableTabs({
	tabs,
	className,
	activeColor = 'primary',
	onChange,
}: ExpandableTabsProps) {
	const [selected, setSelected] = useState<number | null>(0);

	const handleInitialChange = useCallback(() => {
		onChange?.(0);
	}, [onChange]);

	useEffect(() => {
		handleInitialChange();
	}, [handleInitialChange]);

	const handleSelect = useCallback(
		(index: number) => {
			setSelected(index);
			onChange?.(index);
		},
		[onChange]
	);

	return (
		<div className={cn(styles.container, className)}>
			{tabs.map((tab, index) =>
				tab.type === 'separator' ? (
					<Separator key={`separator-${index}`} />
				) : (
					<TabButton
						key={`${tab.title}-${index}`}
						tab={tab}
						index={index}
						isSelected={selected === index}
						activeColor={activeColor}
						onClick={handleSelect}
					/>
				)
			)}
		</div>
	);
}
