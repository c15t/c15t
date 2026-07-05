import { getDataDisabled } from '@c15t/ui/primitives/data-state';
import { getSwitchState, toggleSwitchValue } from '@c15t/ui/primitives/switch';
import styles from '@c15t/ui/styles/v3/switch';
import {
	type ButtonHTMLAttributes,
	forwardRef,
	type KeyboardEvent,
} from 'react';
import { useControllableState } from '~/v3/components/shared/libs/use-controllable-state';
import type { AllThemeKeys, ThemeValue } from '~/v3/types/theme';

export type SwitchSize = 'medium' | 'small';
export interface SwitchVariantsProps {
	size?: SwitchSize;
}
export const switchVariants = () => ({
	root: (options?: { class?: string }) =>
		[styles.root, options?.class].filter(Boolean).join(' '),
	thumb: (options?: { class?: string }) =>
		[styles.thumb, options?.class].filter(Boolean).join(' '),
	track: (options?: { class?: string }) =>
		[styles.track, options?.class].filter(Boolean).join(' '),
});

export type SwitchStylesKeys = {
	'switch.root': ThemeValue;
	'switch.thumb': ThemeValue;
	'switch.track': ThemeValue;
};

export interface SwitchProps
	extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'size'>,
		SwitchVariantsProps {
	checked?: boolean;
	defaultChecked?: boolean;
	noStyle?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	size?: SwitchSize;
	themeKey?: AllThemeKeys;
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
	(
		{
			checked,
			className,
			defaultChecked = false,
			disabled,
			noStyle,
			onCheckedChange,
			onClick,
			onKeyDown,
			size = 'medium',
			type = 'button',
			...rest
		},
		forwardedRef
	) => {
		const variants = switchVariants();
		const [isChecked, setIsChecked] = useControllableState({
			defaultValue: defaultChecked,
			onChange: onCheckedChange,
			value: checked,
		});

		const rootClassName = noStyle
			? className
			: variants.root({ class: className });
		const thumbClassName = noStyle ? undefined : variants.thumb();
		const trackClassName = noStyle ? undefined : variants.track();
		const dataState = getSwitchState(isChecked);
		const dataDisabled = getDataDisabled(disabled);

		const toggle = () => {
			if (disabled) {
				return;
			}

			setIsChecked(toggleSwitchValue(isChecked));
		};

		const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
			toggle();
			onClick?.(event);
		};

		const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				toggle();
			}

			onKeyDown?.(event);
		};

		return (
			<button
				ref={forwardedRef}
				aria-checked={isChecked}
				className={rootClassName}
				data-disabled={dataDisabled}
				data-size={noStyle ? undefined : size}
				data-slot="switch"
				data-state={dataState}
				disabled={disabled}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				role="switch"
				type={type}
				{...rest}
			>
				<span
					className={trackClassName}
					data-slot="switch-track"
				>
					<span
						className={thumbClassName}
						data-slot="switch-thumb"
					/>
				</span>
			</button>
		);
	}
);

Switch.displayName = 'SwitchRoot';

export { Switch as Root };
