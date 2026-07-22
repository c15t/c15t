'use client';

/**
 * Segmented toolbar for the ConsentDialogTrigger compound component.
 *
 * @packageDocumentation
 */

import styles from '@c15t/ui/styles/components/consent-dialog-trigger.module.js';
import type { KeyboardEvent, ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import type {
	ConsentDialogTriggerItem,
	CornerPosition,
	TriggerOrientation,
	TriggerSize,
} from '../types';
import { TriggerIcon } from './icon';
import { useTriggerContext } from './root';

const cornerClassMap = {
	'bottom-right': styles.bottomRight,
	'bottom-left': styles.bottomLeft,
	'top-right': styles.topRight,
	'top-left': styles.topLeft,
} as const satisfies Record<CornerPosition, string | undefined>;

const sizeClassMap = {
	sm: styles.sm,
	md: styles.md,
	lg: styles.lg,
} as const;

function orderItemsForCorner(
	items: readonly ConsentDialogTriggerItem[],
	orientation: TriggerOrientation,
	corner: CornerPosition
): readonly ConsentDialogTriggerItem[] {
	const preferencesIndex = items.findIndex(
		(item) => item.action === 'preferences'
	);
	if (preferencesIndex === -1) {
		return items;
	}

	const preferencesItem = items[preferencesIndex];
	if (!preferencesItem) {
		return items;
	}

	const remainingItems = items.filter((_, index) => index !== preferencesIndex);
	const cornerFacesStart =
		orientation === 'horizontal'
			? corner.endsWith('left')
			: corner.startsWith('top');

	return cornerFacesStart
		? [preferencesItem, ...remainingItems]
		: [...remainingItems, preferencesItem];
}

export interface TriggerToolbarProps {
	/** Actions rendered in toolbar order. */
	items: readonly ConsentDialogTriggerItem[];

	/** Size of each toolbar item. @default 'md' */
	size?: TriggerSize;

	/** Layout direction for the toolbar. @default 'horizontal' */
	orientation?: TriggerOrientation;

	/** Accessible name for the toolbar group. @default 'Privacy controls' */
	ariaLabel?: string;

	/** Additional CSS class names for the toolbar container. */
	className?: string;

	/** When true, removes default toolbar and item styling. @default false */
	noStyle?: boolean;
}

/**
 * A draggable group of actions that can open consent preferences or run a
 * developer-provided callback.
 */
export function TriggerToolbar({
	items,
	size = 'md',
	orientation = 'horizontal',
	ariaLabel = 'Privacy controls',
	className,
	noStyle = false,
}: TriggerToolbarProps): ReactNode {
	const {
		corner,
		isDragging,
		isSnapping,
		wasDragged,
		handlers,
		dragStyle,
		openDialog,
	} = useTriggerContext();
	const orderedItems = useMemo(
		() => orderItemsForCorner(items, orientation, corner),
		[items, orientation, corner]
	);
	const firstEnabledId = orderedItems.find((item) => !item.disabled)?.id;
	const [activeItemId, setActiveItemId] = useState(firstEnabledId);
	const itemRefs = useRef(new Map<string, HTMLButtonElement>());

	const toolbarClasses = noStyle
		? className
		: [
				styles.toolbar,
				orientation === 'vertical' && styles.toolbarVertical,
				cornerClassMap[corner],
				isDragging && styles.dragging,
				isSnapping && styles.snapping,
				className,
			]
				.filter(Boolean)
				.join(' ');

	const itemClasses = noStyle
		? undefined
		: [styles.toolbarItem, sizeClassMap[size]].filter(Boolean).join(' ');
	const resolvedActiveItemId = orderedItems.some(
		(item) => item.id === activeItemId && !item.disabled
	)
		? activeItemId
		: firstEnabledId;

	const handleToolbarKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
		const previousKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';

		if (
			event.key !== nextKey &&
			event.key !== previousKey &&
			event.key !== 'Home' &&
			event.key !== 'End'
		) {
			return;
		}

		const enabledItems = orderedItems.filter((item) => !item.disabled);
		if (enabledItems.length === 0) {
			return;
		}

		event.preventDefault();
		const currentIndex = enabledItems.findIndex(
			(item) => item.id === resolvedActiveItemId
		);
		let nextIndex: number;

		if (event.key === 'Home') {
			nextIndex = 0;
		} else if (event.key === 'End') {
			nextIndex = enabledItems.length - 1;
		} else if (event.key === nextKey) {
			nextIndex = (currentIndex + 1) % enabledItems.length;
		} else {
			nextIndex =
				(currentIndex - 1 + enabledItems.length) % enabledItems.length;
		}

		const nextItem = enabledItems[nextIndex];
		if (nextItem) {
			setActiveItemId(nextItem.id);
			itemRefs.current.get(nextItem.id)?.focus();
		}
	};

	return (
		<div
			role="toolbar"
			aria-label={ariaLabel}
			aria-orientation={orientation}
			className={toolbarClasses}
			data-c15t-trigger="true"
			data-c15t-trigger-toolbar="true"
			style={dragStyle}
			onKeyDown={handleToolbarKeyDown}
			{...handlers}
		>
			{orderedItems.map((item) => {
				const handleClick = () => {
					if (wasDragged()) {
						return;
					}

					item.onSelect?.();
					if (item.action === 'preferences') {
						openDialog();
					}
				};

				return (
					<button
						key={item.id}
						ref={(element) => {
							if (element) {
								itemRefs.current.set(item.id, element);
							} else {
								itemRefs.current.delete(item.id);
							}
						}}
						type="button"
						className={itemClasses}
						data-c15t-trigger-action={item.action}
						aria-label={item.label}
						disabled={item.disabled}
						tabIndex={item.id === resolvedActiveItemId ? 0 : -1}
						onFocus={() => setActiveItemId(item.id)}
						onClick={handleClick}
					>
						<TriggerIcon icon={item.icon} noStyle={noStyle} />
					</button>
				);
			})}
		</div>
	);
}

TriggerToolbar.displayName = 'ConsentDialogTrigger.Toolbar';
