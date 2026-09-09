'use client';

/**
 * Internal toolbar view for ConsentDialogTriggerToolbar.
 *
 * @packageDocumentation
 */

import type { PolicyRight } from '@c15t/schema/types';
import styles from '@c15t/ui/styles/components/consent-dialog-trigger';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';

import { useTranslations } from '~/component-hooks/use-translations';
import { usePolicyRule } from '~/hooks';
import { useTheme } from '~/hooks/use-theme';
import type { ClassNameStyle } from '~/types/theme';
import { useUIConfig } from '~/ui-config-context';
import { mergeSlotProps } from '~/utils/merge-slot-props';

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

/** Right the built-in action stands for; opt-out wins when the rule carries it. */
export type ToolbarPreferencesRight = Extract<
	PolicyRight,
	'opt-out' | 'preferences'
>;

interface ToolbarPreferencesItem extends ToolbarItemBase {
	kind: 'preferences';
	onSelect?: () => void;
	right: ToolbarPreferencesRight;
}

interface ToolbarCustomItem extends ToolbarItemBase {
	kind: 'custom';
	onSelect: () => void;
	pressed?: boolean;
}

type ToolbarItem = ToolbarPreferencesItem | ToolbarCustomItem;

/**
 * The built-in action reflects the strongest persistent right the active
 * rule guarantees: the opt-out label under an opt-out rule, otherwise the
 * preferences label. A host label overrides both.
 */
const resolvePreferencesRight = function resolvePreferencesRight(
	rights: readonly PolicyRight[]
): ToolbarPreferencesRight {
	return rights.includes('opt-out') ? 'opt-out' : 'preferences';
};

interface PreferencesActionDefaults {
	/** Right the built-in action stands for. */
	right: ToolbarPreferencesRight;
	/** Translated default label for that right. */
	label: string;
	/** Every right on the active rule, space separated for `data-c15t-rights`. */
	rights: string;
}

/** Default label and right for the built-in action, from the active rule. */
const usePreferencesActionDefaults =
	function usePreferencesActionDefaults(): PreferencesActionDefaults {
		const policy = usePolicyRule();
		const { rights: rightsTranslations } = useTranslations();
		return useMemo(() => {
			const right = resolvePreferencesRight(policy.rights);
			const label =
				right === 'opt-out'
					? (rightsTranslations?.optOut ?? 'Do not sell or share my data')
					: (rightsTranslations?.preferences ?? 'Manage preferences');
			return { label, right, rights: policy.rights.join(' ') };
		}, [policy.rights, rightsTranslations]);
	};

const createToolbarItems = function createToolbarItems(
	actions: readonly ConsentDialogTriggerToolbarAction[],
	preferences: ConsentDialogTriggerToolbarPreferences,
	right: ToolbarPreferencesRight,
	defaultLabel: string,
	showPreferences: boolean
): readonly ToolbarItem[] {
	const customItems: ToolbarCustomItem[] = actions.map((action) => ({
		...action,
		focusId: `custom:${action.id}`,
		kind: 'custom',
	}));

	if (!showPreferences) {
		return customItems;
	}

	return [
		...customItems,
		{
			className: preferences.className,
			focusId: 'preferences',
			icon: preferences.icon ?? 'branding',
			id: 'preferences',
			kind: 'preferences',
			label: preferences.label ?? defaultLabel,
			onSelect: preferences.onSelect,
			right,
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

	/**
	 * Whether the built-in preferences action is rendered. App-owned
	 * actions render regardless.
	 * @default true
	 */
	showPreferences?: boolean;
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
	showPreferences = true,
	className,
	style,
	noStyle = false,
}: TriggerToolbarProps): ReactNode => {
	const { components } = useUIConfig();
	const { noStyle: contextNoStyle } = useTheme();
	const {
		label: defaultPreferencesLabel,
		right: preferencesRight,
		rights: policyRights,
	} = usePreferencesActionDefaults();
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
				createToolbarItems(
					actions,
					preferences,
					preferencesRight,
					defaultPreferencesLabel,
					showPreferences
				),
				orientation,
				corner
			),
		[
			actions,
			corner,
			defaultPreferencesLabel,
			orientation,
			preferences,
			preferencesRight,
			showPreferences,
		]
	);
	const firstEnabledId = orderedItems.find((item) => !item.disabled)?.focusId;
	const [activeItemId, setActiveItemId] = useState(firstEnabledId);
	const itemRefs = useRef(new Map<string, HTMLButtonElement>());

	const finalNoStyle = noStyle || contextNoStyle;
	const toolbarDOMStyle = mergeSlotProps(components?.trigger?.toolbar, {
		baseClassName: [
			styles.toolbar,
			orientation === 'vertical' && styles.toolbarVertical,
			cornerClassMap[corner],
			isDragging && styles.dragging,
			isSnapping && styles.snapping,
		],
		className,
		noStyle: finalNoStyle,
		style,
	});
	const itemDOMStyle = mergeSlotProps(components?.trigger?.toolbarItem, {
		baseClassName: [styles.toolbarItem, sizeClassMap[size]],
		noStyle: finalNoStyle,
	});
	const iconDOMStyle = mergeSlotProps(components?.trigger?.toolbarIcon, {
		baseClassName: styles.toolbarIcon,
		noStyle: finalNoStyle,
	});
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
			{...toolbarDOMStyle}
			aria-label={ariaLabel}
			aria-orientation={orientation}
			data-corner={corner}
			data-c15t-trigger-toolbar="true"
			data-c15t-trigger="true"
			data-dragging={isDragging || undefined}
			data-snapping={isSnapping || undefined}
			dir="ltr"
			onKeyDown={handleToolbarKeyDown}
			role="toolbar"
			style={{ ...toolbarDOMStyle.style, ...dragStyle }}
			tabIndex={-1}
			{...handlers}
		>
			{orderedItems.map((item) => (
				<button
					{...itemDOMStyle}
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
					data-c15t-rights={
						item.kind === 'preferences' ? policyRights : undefined
					}
					data-c15t-trigger-action={item.kind}
					data-c15t-trigger-item={item.id}
					data-right={item.kind === 'preferences' ? item.right : undefined}
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
							noStyle={finalNoStyle}
						/>
					</span>
				</button>
			))}
		</div>
	);
};

TriggerToolbar.displayName = 'ConsentDialogTriggerToolbar';
