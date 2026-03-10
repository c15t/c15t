import {
	type SwitchSize,
	type SwitchVariantsProps,
	switchVariants,
} from '@c15t/ui/styles/primitives';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import {
	type ComponentPropsWithoutRef,
	type ComponentRef,
	forwardRef,
} from 'react';
import type { AllThemeKeys, ThemeValue } from '~/types/theme';

// Re-export types for convenience
export type { SwitchSize, SwitchVariantsProps };

// Re-export the helper function
export { switchVariants };

export type SwitchStylesKeys = {
	'switch.root': ThemeValue;
	'switch.thumb': ThemeValue;
	'switch.track': ThemeValue;
};

/**
 * Props for the Switch component.
 * Extends Radix Switch primitive props with variant support.
 *
 * @public
 */
export interface SwitchProps
	extends ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>,
		SwitchVariantsProps {
	/**
	 * When true, removes default styles.
	 */
	noStyle?: boolean;
	/**
	 * Theme key for custom theming.
	 */
	themeKey?: AllThemeKeys;
}

/**
 * Switch component with explicit variant support.
 *
 * @remarks
 * A toggle switch component built on Radix UI primitives with
 * explicit size variants for type-safe styling.
 *
 * @example
 * ```tsx
 * <Switch size="small" />
 * <Switch size="medium" checked={isEnabled} onCheckedChange={setIsEnabled} />
 * ```
 *
 * @public
 */
const Switch = forwardRef<
	ComponentRef<typeof SwitchPrimitives.Root>,
	SwitchProps
>(
	(
		{ className, disabled, size = 'medium', noStyle, ...rest },
		forwardedRef
	) => {
		const variants = switchVariants({ size });

		const rootClassName = noStyle
			? className
			: variants.root({ class: className });

		const thumbClassName = noStyle ? undefined : variants.thumb({ disabled });

		const trackClassName = noStyle ? undefined : variants.track({ disabled });

		return (
			<SwitchPrimitives.Root
				ref={forwardedRef}
				disabled={disabled}
				className={rootClassName}
				{...rest}
			>
				<span className={trackClassName}>
					<SwitchPrimitives.Thumb
						className={thumbClassName}
						style={{
							['--mask' as string]:
								'radial-gradient(circle farthest-side at 50% 50%, #0000 1.95px, #000 2.05px 100%) 50% 50%/100% 100% no-repeat',
						}}
					/>
				</span>
			</SwitchPrimitives.Root>
		);
	}
);
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch as Root };
