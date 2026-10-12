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

/**
 * A `components` part, plus the `noStyle` flag a `theme.slots` entry puts
 * on it through `applyThemeSlots`.
 */
type SlotPropsInput = ReactSlotProps & { noStyle?: boolean };

/**
 * Merge a `components` part with a component's own props.
 *
 * The stock `baseClassName` is dropped when the component's `noStyle` or
 * the part's `noStyle` is set; the part's and the component's classes
 * stay, as `resolveStyles` keeps theme slot classes under `noStyle`.
 */
export const mergeSlotProps = function mergeSlotProps(
	slotProps: SlotPropsInput | undefined,
	{ baseClassName, className, noStyle, style, ...ownProps }: MergeSlotPropsInput
): MergedSlotProps {
	const { noStyle: slotNoStyle, ...slotAttributes } = slotProps ?? {};
	const mergedStyle =
		slotAttributes.style || style
			? { ...slotAttributes.style, ...style }
			: undefined;
	const mergedClassName = cn(
		noStyle || slotNoStyle ? undefined : baseClassName,
		slotAttributes.className,
		className
	);

	return {
		...slotAttributes,
		...ownProps,
		className: mergedClassName || undefined,
		style: mergedStyle as CSSPropertiesWithVars | undefined,
	};
};
