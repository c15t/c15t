'use client';

import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '~/components/icons';
import { FlagsIcon } from '~/components/icons/flags';
import { cn } from '~/libs/utils';
import { useWidthContext } from '~/router/use-width-context';
import styles from './expandable-tabs.module.css';

interface Tab {
	title: string;
	icon: IconName;
	iconType?: 'flags' | 'optin';
	width?: 'auto' | `${number}px`;
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
		const iconType = tab.iconType || 'optin';

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
				{iconType === 'flags' ? (
					<FlagsIcon name={tab.icon} size={20} />
				) : (
					<Icon name={tab.icon} size={20} />
				)}
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
	const containerRef = useRef<HTMLDivElement>(null);
	const { setTabWidth, setSelectedTabIndex, setTabWidths } = useWidthContext();

	const handleInitialChange = useCallback(() => {
		onChange?.(0);
	}, [onChange]);

	useEffect(() => {
		handleInitialChange();
	}, [handleInitialChange]);

	// Extract tab widths from tabs array and store in context
	useEffect(() => {
		const widths = new Map<number, 'auto' | `${number}px`>();
		tabs.forEach((tab, index) => {
			if (tab.type !== 'separator' && tab.width) {
				widths.set(index, tab.width);
			}
		});
		setTabWidths(widths);
	}, [tabs, setTabWidths]);

	// Measure width and update CSS variable
	const measureWidth = useCallback(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const width = container.scrollWidth;
		setTabWidth(width);
		// Also set CSS variable on container for CSS transitions
		container.style.setProperty('--tabs-container-width', `${width}px`);
	}, [setTabWidth]);

	// Update selected tab index when it changes
	useEffect(() => {
		setSelectedTabIndex(selected);
	}, [selected, setSelectedTabIndex]);

	// Use ResizeObserver to track width changes
	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const observer = new ResizeObserver(() => {
			measureWidth();
		});

		observer.observe(container);
		measureWidth(); // Initial measurement

		return () => observer.disconnect();
	}, [measureWidth]);

	const handleSelect = useCallback(
		(index: number) => {
			setSelected(index);
			setSelectedTabIndex(index);
			onChange?.(index);
			// Remeasure after tab animations complete (delay: 0.1s + duration: 0.6s = 0.7s + buffer)
			setTimeout(() => {
				measureWidth();
			}, 800);
		},
		[onChange, measureWidth, setSelectedTabIndex]
	);

	return (
		<div ref={containerRef} className={cn(styles.container, className)}>
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
