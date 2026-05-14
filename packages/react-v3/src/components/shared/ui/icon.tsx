import {
	type ElementType,
	forwardRef,
	type JSX,
	type Ref,
	type SVGProps,
} from 'react';

const Icon = (
	props: SVGProps<SVGSVGElement>,
	ref: Ref<SVGSVGElement>,
	title: string | undefined,
	iconPath: JSX.Element
) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeLinecap="round"
		strokeLinejoin="round"
		strokeWidth={2}
		aria-hidden={title ? undefined : true}
		ref={ref}
		{...props}
	>
		{title ? <title>{title}</title> : null}
		{iconPath}
	</svg>
);

type LucideIconProps = SVGProps<SVGSVGElement> & {
	title?: string;
	iconPath: JSX.Element;
};

export const LucideIcon = ({ title, iconPath }: LucideIconProps) => {
	const IconComponent = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
		(svgProps, ref) => Icon(svgProps, ref, title, iconPath)
	);
	return IconComponent as ElementType;
};
