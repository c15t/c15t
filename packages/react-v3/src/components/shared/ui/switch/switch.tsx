import { getDataDisabled } from '@c15t/ui/primitives/data-state';
import { getSwitchState, toggleSwitchValue } from '@c15t/ui/primitives/switch';
import {
	type SwitchSize,
	type SwitchVariantsProps,
	switchVariants,
} from '@c15t/ui/styles/primitives/switch';
import { sanitizeDOMStyleProps } from '@c15t/ui/utils';
import {
	type ButtonHTMLAttributes,
	forwardRef,
	type KeyboardEvent,
} from 'react';
import { useControllableState } from '~/components/shared/libs/use-controllable-state';
import { useStyles } from '~/hooks/use-styles';
import type { AllThemeKeys, ThemeValue } from '~/types/theme';

export type { SwitchSize, SwitchVariantsProps };
export { switchVariants };

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
			themeKey,
			type = 'button',
			...rest
		},
		forwardedRef
	) => {
		const variants = switchVariants({ size });
		const [isChecked, setIsChecked] = useControllableState({
			defaultValue: defaultChecked,
			onChange: onCheckedChange,
			value: checked,
		});

		const rootClassName = noStyle
			? className
			: variants.root({ class: className, disabled });
		const thumbClassName = noStyle ? undefined : variants.thumb({ disabled });
		const trackClassName = noStyle ? undefined : variants.track({ disabled });
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

		const themedRoot = useStyles((themeKey ?? 'toggle') as AllThemeKeys, {
			className: rootClassName,
			noStyle,
		});
		const domStyleProps = sanitizeDOMStyleProps(themedRoot);

		return (
			<button
				ref={forwardedRef}
				aria-checked={isChecked}
				data-disabled={dataDisabled}
				data-slot="switch"
				data-state={dataState}
				disabled={disabled}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				role="switch"
				type={type}
				{...domStyleProps}
				{...rest}
			>
				<span className={trackClassName} data-slot="switch-track">
					<span className={thumbClassName} data-slot="switch-thumb" />
				</span>
			</button>
		);
	}
);

Switch.displayName = 'SwitchRoot';

export { Switch as Root };
