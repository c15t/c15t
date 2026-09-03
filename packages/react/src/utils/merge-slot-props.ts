import type { ConsentComponentSlotKey } from '@c15t/schema/config';
import type { ClassValue } from '@c15t/ui/utils';

import type { ReactComponentSlots, ReactSlotProps } from '~/types/slots';
import type { CSSPropertiesWithVars } from '~/types/theme';

import { cnExt as cn } from './cn';

type MergeSlotPropsInput = ReactSlotProps & {
	baseClassName?: ClassValue;
	noStyle?: boolean;
};

export const getSlotProps = function getSlotProps(
	components: ReactComponentSlots | undefined,
	slotKey: ConsentComponentSlotKey | undefined
): ReactSlotProps | undefined {
	if (!slotKey) {
		return;
	}

	const [group, slot] = slotKey.split('.') as [
		keyof ReactComponentSlots,
		string,
	];
	return components?.[group]?.[
		slot as keyof (typeof components)[typeof group]
	] as ReactSlotProps | undefined;
};

export type MergedSlotProps = Omit<ReactSlotProps, 'style'> & {
	style?: CSSPropertiesWithVars;
};

export const mergeSlotProps = function mergeSlotProps(
	slotProps: ReactSlotProps | undefined,
	{ baseClassName, className, noStyle, style, ...ownProps }: MergeSlotPropsInput
): MergedSlotProps {
	const mergedStyle =
		slotProps?.style || style ? { ...slotProps?.style, ...style } : undefined;
	const mergedClassName = cn(
		noStyle ? undefined : baseClassName,
		slotProps?.className,
		className
	);

	return {
		...slotProps,
		...ownProps,
		className: mergedClassName || undefined,
		style: mergedStyle as CSSPropertiesWithVars | undefined,
	};
};
