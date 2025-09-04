'use client';

import type { JSX } from 'preact';
import { useCallback, useEffect, useState } from 'preact/compat';
import { forwardRef } from 'preact/compat';

import { Box } from '~/components/shared/primitives/box';
import { useStyles } from '~/hooks/use-styles';
import type { ExtendThemeKeys, ThemeValue } from '~/types/theme';
import styles from './switch.module.css';

export type SwitchStylesKeys = {
	'switch.root': ThemeValue;
	'switch.thumb': ThemeValue;
	'switch.track': ThemeValue;
};

export interface SwitchProps
	extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'onChange'> {
	/** Controlled state */
	checked?: boolean;
	/** Uncontrolled initial state */
	defaultChecked?: boolean;
	/** Change handler (receives the next checked value) */
	onCheckedChange?: (checked: boolean) => void;
	/** Disable interaction */
	disabled?: boolean;

	theme?: {
		root: ExtendThemeKeys;
		thumb: ExtendThemeKeys;
		track: ExtendThemeKeys;
	};
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
	(
		{
			className,
			checked,
			defaultChecked,
			onCheckedChange,
			disabled,
			theme,
			onKeyDown,
			onClick,
			...rest
		},
		forwardedRef
	) => {
		// Controlled vs uncontrolled
		const isControlled = checked !== undefined;
		const [internalChecked, setInternalChecked] = useState<boolean>(
			!!defaultChecked
		);

		// Keep internal state in sync if switching to controlled later
		useEffect(() => {
			if (isControlled) {
				setInternalChecked(!!checked);
			}
		}, [isControlled, checked]);

		const currentChecked = isControlled ? !!checked : internalChecked;

		const setChecked = useCallback(
			(next: boolean) => {
				if (!isControlled) setInternalChecked(next);
				onCheckedChange?.(next);
			},
			[isControlled, onCheckedChange]
		);

		const handleToggle = useCallback(
			(e: JSX.TargetedMouseEvent<HTMLButtonElement> | KeyboardEvent) => {
				if (disabled) return;
				setChecked(!currentChecked);
			},
			[disabled, currentChecked, setChecked]
		);

		const handleClick = useCallback(
			(e: JSX.TargetedMouseEvent<HTMLButtonElement>) => {
				onClick?.(e);
				if (e.defaultPrevented) return;
				handleToggle(e);
			},
			[onClick, handleToggle]
		);

		const handleKeyDown = useCallback(
			(e: JSX.TargetedKeyboardEvent<HTMLButtonElement>) => {
				onKeyDown?.(e);
				if (e.defaultPrevented || disabled) return;
				// Space or Enter toggles
				if (e.key === ' ' || e.key === 'Enter') {
					e.preventDefault();
					handleToggle(e as unknown as KeyboardEvent);
				}
			},
			[onKeyDown, disabled, handleToggle]
		);

		const switchRoot = useStyles(theme?.root.themeKey ?? 'switch.root', {
			...theme?.root,
			baseClassName: [styles.root, theme?.root.baseClassName],
			className: className?.toString(),
		});

		const switchThumb = useStyles(theme?.thumb.themeKey ?? 'switch.thumb', {
			...theme?.thumb,
			baseClassName: [
				theme?.thumb.baseClassName,
				styles.thumb,
				disabled && styles['thumb-disabled'],
			],
			style: {
				...theme?.thumb.style,
				['--mask' as string]:
					'radial-gradient(circle farthest-side at 50% 50%, #0000 1.95px, #000 2.05px 100%) 50% 50%/100% 100% no-repeat',
			},
		});

		return (
			<button
				ref={forwardedRef}
				type="button"
				role="switch"
				aria-checked={currentChecked}
				aria-disabled={disabled || undefined}
				disabled={disabled}
				data-state={currentChecked ? 'checked' : 'unchecked'}
				{...rest}
				{...switchRoot}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
			>
				<Box
					themeKey={theme?.track.themeKey ?? 'switch.track'}
					baseClassName={[styles.track, disabled && styles['track-disabled']]}
					style={theme?.track.style}
				>
					{/* The thumb can be positioned via CSS using [data-state] */}
					<span {...switchThumb} />
				</Box>
			</button>
		);
	}
);

Switch.displayName = 'Switch';

export { Switch as Root };
