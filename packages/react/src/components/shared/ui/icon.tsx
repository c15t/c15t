import { forwardRef } from 'react';
import type { ElementType, JSX, Ref, SVGProps } from 'react';

const Icon = (
	props: SVGProps<SVGSVGElement>,
	ref: Ref<SVGSVGElement>,
	title: string | undefined,
	iconPath: JSX.Element
) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeLinecap="round"
		strokeLinejoin="round"
		strokeWidth={2}
		ref={ref}
		{...props}
	>
		{title ? <title>{title}</title> : null}
		{iconPath}
	</svg>
);

type LucideIconProps = SVGProps<SVGSVGElement> & {
	/** Omit for a decorative icon that must add nothing to an accessible name. */
	title?: string;
	iconPath: JSX.Element;
};

export const LucideIcon = ({ title, iconPath }: LucideIconProps) => {
	const IconComponent = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
		(svgProps, ref) => Icon(svgProps, ref, title, iconPath)
	);
	IconComponent.displayName = `${title ?? 'Decorative'}Icon`;
	return IconComponent as ElementType;
};
