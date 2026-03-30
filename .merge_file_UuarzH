'use client';

import * as SwitchPrimitives from '@radix-ui/react-switch';
import {
	type ComponentPropsWithoutRef,
	type ComponentRef,
	type ForwardRefExoticComponent,
	forwardRef,
	type RefAttributes,
} from 'react';
import './switch.css';

type SwitchProps = ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>;
type SwitchRef = ComponentRef<typeof SwitchPrimitives.Root>;
type SwitchComponent = ForwardRefExoticComponent<
	SwitchProps & RefAttributes<SwitchRef>
>;

const Switch: SwitchComponent = forwardRef<SwitchRef, SwitchProps>(
	({ className, ...props }, ref) => (
		<SwitchPrimitives.Root
			className={`c15t-devtool-switch-root ${className || ''}`}
			{...props}
			ref={ref}
		>
			<SwitchPrimitives.Thumb className="c15t-devtool-switch-thumb" />
		</SwitchPrimitives.Root>
	)
);
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
