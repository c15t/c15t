import type { SVGProps } from 'react';

// @generated BEGIN IconName
export type IconName =
	| 'alert'
	| 'chevron-down'
	| 'close'
	| 'external-link'
	| 'eye'
	| 'minus'
	| 'radio-button'
	| 'refresh'
	| 'speed-fast';
// @generated END IconName

export type Dim = number | string;

export type IconProps = SVGProps<SVGSVGElement> & {
	name: IconName;
	size?: Dim;
	width?: Dim;
	height?: Dim;
	/** Accessible title for the SVG; falls back to `name` when omitted. */
	title?: string;
};
