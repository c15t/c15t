'use client';

import * as SwitchPrimitives from '@radix-ui/react-switch';
import {
	type ComponentPropsWithoutRef,
	type ComponentRef,
	forwardRef,
} from 'react';
import './switch.css';

const Switch = forwardRef<
	ComponentRef<typeof SwitchPrimitives.Root>,
	ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
	<SwitchPrimitives.Root
		className={`c15t-devtool-switch-root ${className || ''}`}
		{...props}
		ref={ref}
	>
		<SwitchPrimitives.Thumb className="c15t-devtool-switch-thumb" />
	</SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
