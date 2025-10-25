'use client';

import * as SwitchPrimitives from '@radix-ui/react-switch';
import {
	type ComponentPropsWithoutRef,
	type ComponentRef,
	forwardRef,
} from 'react';
import { cn } from '~/libs/utils';
import styles from './switch.module.css';

const Switch = forwardRef<
	ComponentRef<typeof SwitchPrimitives.Root>,
	ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
	<SwitchPrimitives.Root
		className={cn(styles.root, className)}
		{...props}
		ref={ref}
	>
		<SwitchPrimitives.Thumb className={styles.thumb} />
	</SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
