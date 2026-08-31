'use client';

/**
 * Internal toolbar view for ConsentDialogTriggerToolbar.
 *
 * @packageDocumentation
 */

import styles from '@c15t/ui/styles/components/consent-dialog-trigger.module.js';
import { sanitizeDOMStyleProps } from '@c15t/ui/utils';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';

import { useStyles } from '~/hooks/use-styles';
import type { ClassNameStyle } from '~/types/theme';

import type {
	ConsentDialogTriggerToolbarAction,
	ConsentDialogTriggerToolbarPreferences,
	CornerPosition,
	TriggerOrientation,
	TriggerSize,
} from '../types';
import { TriggerIcon } from './icon';
import { useTriggerContext } from './root';

const cornerClassMap = {
	'bottom-left': styles.bottomLeft,
	'bottom-right': styles.bottomRight,
	'top-left': styles.topLeft,
	'top-right': styles.topRight,
} as const satisfies Record<CornerPosition, string | undefined>;

const sizeClassMap = {
	lg: styles.lg,
	md: styles.md,
	sm: styles.sm,
} as const;

interface ToolbarItemBase {
	className?: string;
	disabled?: boolean;
	focusId: string;
	icon: ConsentDialogTriggerToolbarAction['icon'];
	id: string;
	label: string;
	style?: ConsentDialogTriggerToolbarAction['style'];
}

interface ToolbarPreferencesItem extends ToolbarItemBase {
	kind: 'preferences';
	onSelect?: () => void;
}

interface ToolbarCustomItem extends ToolbarItemBase {
	kind: 'custom';
	onSelect: () => void;
	pressed?: boolean;
}

type ToolbarItem = ToolbarPreferencesItem | ToolbarCustomItem;

const createToolbarItems = function createToolbarItems(
	actions: readonly ConsentDialogTriggerToolbarAction[],
	preferences: ConsentDialogTriggerToolbarPreferences
): readonly ToolbarItem[] {
	const customItems: ToolbarCustomItem[] = actions.map((action) => ({
		...action,
		focusId: `custom:${action.id}`,
		kind: 'custom',
	}));

	return [
		...customItems,
		{
			className: preferences.className,
			focusId: 'preferences',
			icon: preferences.icon ?? 'branding',
			id: 'preferences',
			kind: 'preferences',
			label: preferences.label ?? 'Open privacy settings',
			onSelect: preferences.onSelect,
			style: preferences.style,
		},
	];
};

const orderItemsForCorner = function orderItemsForCorner(
	items: readonly ToolbarItem[],
	orientation: TriggerOrientation,
	corner: CornerPosition
): readonly ToolbarItem[] {
	const preferencesItem = items.find((item) => item.kind === 'preferences');
	if (!preferencesItem) {
		return items;
	}

	const customItems = items.filter((item) => item.kind === 'custom');
	const cornerFacesStart =
		orientation === 'horizontal'
			? corner.endsWith('left')
			: corner.startsWith('top');

	return cornerFacesStart
		? [preferencesItem, ...customItems]
		: [...customItems, preferencesItem];
};

export interface TriggerToolbarProps extends Omit<
	ClassNameStyle,
	'baseClassName'
> {
	/** App-owned actions rendered alongside the preferences action. */
	actions: readonly ConsentDialogTriggerToolbarAction[];

	/** Customization for the built-in preferences action. */
	preferences: ConsentDialogTriggerToolbarPreferences;

	/** Size of each toolbar item. @default 'md' */
	size?: TriggerSize;

	/** Layout direction for the toolbar. @default 'horizontal' */
	orientation?: TriggerOrientation;

	/** Accessible name for the toolbar group. @default 'Privacy controls' */
	ariaLabel?: string;
}

/**
 * A draggable group of app-owned actions and one built-in preferences action.
 */
export const TriggerToolbar = ({
	actions,
	preferences,
	size = 'md',
	orientation = 'horizontal',
	ariaLabel = 'Privacy controls',
	className,
	style,
	noStyle = false,
}: TriggerToolbarProps): ReactNode => {
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
		() =>
			orderItemsForCorner(
				createToolbarItems(actions, preferences),
				orientation,
				corner
			),
		[actions, corner, orientation, preferences]
	);
	const firstEnabledId = orderedItems.find((item) => !item.disabled)?.focusId;
	const [activeItemId, setActiveItemId] = useState(firstEnabledId);
	const itemRefs = useRef(new Map<string, HTMLButtonElement>());

	const toolbarStyle = useStyles('consentDialogTriggerToolbar', {
		baseClassName: [
			styles.toolbar,
			orientation === 'vertical' && styles.toolbarVertical,
			cornerClassMap[corner],
			isDragging && styles.dragging,
			isSnapping && styles.snapping,
		],
		className,
		noStyle,
		style,
	});
	const toolbarDOMStyle = sanitizeDOMStyleProps(toolbarStyle);
	const itemStyle = useStyles('consentDialogTriggerToolbarItem', {
		baseClassName: [styles.toolbarItem, sizeClassMap[size]],
		noStyle,
	});
	const itemDOMStyle = sanitizeDOMStyleProps(itemStyle);
	const iconStyle = useStyles('consentDialogTriggerToolbarIcon', {
		baseClassName: styles.toolbarIcon,
		noStyle,
	});
	const iconDOMStyle = sanitizeDOMStyleProps(iconStyle);
	const resolvedActiveItemId = orderedItems.some(
		(item) => item.focusId === activeItemId && !item.disabled
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
			(item) => item.focusId === resolvedActiveItemId
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
			setActiveItemId(nextItem.focusId);
			itemRefs.current.get(nextItem.focusId)?.focus();
		}
	};

	const handleItemClick = (
		event: MouseEvent<HTMLButtonElement>,
		item: ToolbarItem
	) => {
		const isPointerClick = event.detail !== 0;
		if (isPointerClick && wasDragged()) {
			return;
		}

		item.onSelect?.();
		if (item.kind === 'preferences') {
			openDialog();
		}
	};

	return (
		<div
			aria-label={ariaLabel}
			aria-orientation={orientation}
			className={toolbarDOMStyle.className}
			data-corner={corner}
			data-c15t-trigger-toolbar="true"
			data-c15t-trigger="true"
			data-dragging={isDragging || undefined}
			data-snapping={isSnapping || undefined}
			dir="ltr"
			onKeyDown={handleToolbarKeyDown}
			role="toolbar"
			tabIndex={-1}
			style={{ ...toolbarDOMStyle.style, ...dragStyle }}
			{...handlers}
		>
			{orderedItems.map((item) => (
				<button
					key={item.focusId}
					ref={(element) => {
						if (element) {
							itemRefs.current.set(item.focusId, element);
						} else {
							itemRefs.current.delete(item.focusId);
						}
					}}
					aria-label={item.label}
					aria-pressed={item.kind === 'custom' ? item.pressed : undefined}
					className={[itemDOMStyle.className, item.className]
						.filter(Boolean)
						.join(' ')}
					data-c15t-trigger-action={item.kind}
					data-c15t-trigger-item={item.id}
					disabled={item.disabled}
					onClick={(event) => handleItemClick(event, item)}
					onFocus={() => setActiveItemId(item.focusId)}
					style={{ ...itemDOMStyle.style, ...item.style }}
					tabIndex={item.focusId === resolvedActiveItemId ? 0 : -1}
					type="button"
				>
					<span
						{...iconDOMStyle}
						aria-hidden="true"
					>
						<TriggerIcon
							icon={item.icon}
							noStyle
						/>
					</span>
				</button>
			))}
		</div>
	);
};

TriggerToolbar.displayName = 'ConsentDialogTriggerToolbar';
