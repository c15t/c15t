import type { ConsentComponentSlots } from '@c15t/schema/config';
import type { HTMLAttributes } from 'react';

/** Framework-native attribute bag bound to a themable slot. */
export type ReactSlotProps = HTMLAttributes<HTMLElement> &
	Record<`data-${string}`, string | number | boolean | undefined>;

export type ReactComponentSlots = ConsentComponentSlots<ReactSlotProps>;
