'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import React, {
	type ComponentPropsWithoutRef,
	type ComponentRef,
	createContext,
	forwardRef,
	useContext,
} from 'react';
import { Icon, type IconName } from '~/components/icons';
import { FlagsIcon } from '~/components/icons/flags';
import { cn } from '~/libs/utils';
import { ScrollArea } from './scroll-area';
import styles from './select.module.css';

type SelectContextType = {
	size?: 'medium' | 'small' | 'xsmall';
	variant?: 'default' | 'compact' | 'compactForInput' | 'inline';
	hasError?: boolean;
};

const SelectContext = createContext<SelectContextType>({
	size: 'medium',
	variant: 'default',
	hasError: false,
});

const useSelectContext = () => useContext(SelectContext);

const SelectRoot = ({
	size = 'medium',
	variant = 'default',
	hasError,
	...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Root> &
	SelectContextType) => {
	return (
		<SelectContext.Provider value={{ size, variant, hasError }}>
			<SelectPrimitive.Root {...props} />
		</SelectContext.Provider>
	);
};

const SelectGroup = SelectPrimitive.Group;
SelectGroup.displayName = 'SelectGroup';

const SelectValue = SelectPrimitive.Value;
SelectValue.displayName = 'SelectValue';

const SelectSeparator = SelectPrimitive.Separator;
SelectSeparator.displayName = 'SelectSeparator';

const SelectGroupLabel = SelectPrimitive.Label;
SelectGroupLabel.displayName = 'SelectGroupLabel';

const SelectTrigger = forwardRef<
	ComponentRef<typeof SelectPrimitive.Trigger>,
	ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
	const { size, variant, hasError } = useSelectContext();

	const sizeClass =
		size === 'small'
			? styles.sizeSmall
			: size === 'xsmall'
				? styles.sizeXsmall
				: styles.sizeMedium;
	const variantClass =
		variant === 'compact'
			? styles.compact
			: variant === 'compactForInput'
				? styles.compactForInput
				: variant === 'inline'
					? styles.inline
					: styles.default;

	return (
		<SelectPrimitive.Trigger
			ref={ref}
			className={cn(
				styles.trigger,
				sizeClass,
				variantClass,
				hasError && styles.hasError,
				className
			)}
			{...props}
		>
			{children}
			<SelectPrimitive.Icon asChild>
				<Icon name="chevron-down" size={20} className={styles.triggerArrow} />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
});
SelectTrigger.displayName = 'SelectTrigger';

interface SelectTriggerIconProps extends ComponentPropsWithoutRef<'div'> {
	as?: React.ElementType;
	icon?: IconName;
	flag?: IconName;
}

const SelectTriggerIcon = forwardRef<HTMLDivElement, SelectTriggerIconProps>(
	({ as: Component = 'div', className, icon, flag, ...props }, ref) => {
		const { size, variant } = useSelectContext();

		return (
			<Component
				ref={ref}
				className={cn(
					styles.triggerIcon,
					size === 'xsmall' && styles.triggerIconXsmall,
					variant === 'compact' && styles.triggerIconCompact,
					className
				)}
				{...props}
			>
				{flag ? (
					<FlagsIcon name={flag} size={size === 'xsmall' ? 16 : 20} />
				) : icon ? (
					<Icon name={icon} size={size === 'xsmall' ? 16 : 20} />
				) : null}
			</Component>
		);
	}
);
SelectTriggerIcon.displayName = 'SelectTriggerIcon';

const SelectContent = forwardRef<
	ComponentRef<typeof SelectPrimitive.Content>,
	ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(
	(
		{ className, position = 'popper', children, sideOffset = 8, ...props },
		ref
	) => {
		return (
			<SelectPrimitive.Portal>
				<SelectPrimitive.Content
					ref={ref}
					className={cn(styles.content, className)}
					sideOffset={sideOffset}
					position={position}
					{...props}
				>
					<SelectPrimitive.Viewport asChild>
						<ScrollArea className={styles.contentScrollArea}>
							<div className={styles.viewport}>{children}</div>
						</ScrollArea>
					</SelectPrimitive.Viewport>
				</SelectPrimitive.Content>
			</SelectPrimitive.Portal>
		);
	}
);
SelectContent.displayName = 'SelectContent';

const SelectItem = forwardRef<
	ComponentRef<typeof SelectPrimitive.Item>,
	ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => {
	const { size } = useSelectContext();

	// Check if children contains an ItemIcon (flag or icon)
	const hasIcon = React.Children.toArray(children).some((child) => {
		if (!React.isValidElement(child)) {
			return false;
		}
		if (child.type === SelectItemIcon) {
			return true;
		}
		// Check displayName for cases where the component is wrapped
		const type = child.type as { displayName?: string } | null | undefined;
		return type?.displayName === 'SelectItemIcon';
	});

	return (
		<SelectPrimitive.Item
			ref={ref}
			className={cn(
				styles.item,
				size === 'xsmall' && styles.itemXsmall,
				hasIcon && styles.itemWithIcon,
				className
			)}
			{...props}
		>
			<SelectPrimitive.ItemText asChild>
				<span className={styles.itemText}>
					{typeof children === 'string' ? (
						<span className={styles.itemTextInner}>{children}</span>
					) : (
						children
					)}
				</span>
			</SelectPrimitive.ItemText>
			{!hasIcon && (
				<SelectPrimitive.ItemIndicator asChild>
					<Icon
						name="radio-button"
						size={20}
						className={styles.itemIndicator}
					/>
				</SelectPrimitive.ItemIndicator>
			)}
		</SelectPrimitive.Item>
	);
});
SelectItem.displayName = 'SelectItem';

interface SelectItemIconProps extends ComponentPropsWithoutRef<'div'> {
	as?: React.ElementType;
	icon?: IconName;
	flag?: IconName;
}

const SelectItemIcon = forwardRef<HTMLDivElement, SelectItemIconProps>(
	({ as: Component = 'div', className, icon, flag, ...props }, ref) => {
		const { size, variant } = useSelectContext();

		return (
			<Component
				ref={ref}
				className={cn(
					styles.itemIcon,
					size === 'xsmall' && styles.itemIconXsmall,
					variant === 'compact' && styles.itemIconCompact,
					className
				)}
				{...props}
			>
				{flag ? (
					<FlagsIcon name={flag} size={size === 'xsmall' ? 16 : 20} />
				) : icon ? (
					<Icon name={icon} size={size === 'xsmall' ? 16 : 20} />
				) : null}
			</Component>
		);
	}
);
SelectItemIcon.displayName = 'SelectItemIcon';

export {
	SelectRoot as Root,
	SelectContent as Content,
	SelectGroup as Group,
	SelectGroupLabel as GroupLabel,
	SelectItem as Item,
	SelectItemIcon as ItemIcon,
	SelectSeparator as Separator,
	SelectTrigger as Trigger,
	SelectTriggerIcon as TriggerIcon,
	SelectValue as Value,
};
