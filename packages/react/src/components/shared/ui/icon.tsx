import {
	type ElementType,
	type JSX,
	type Ref,
	type SVGProps,
	forwardRef,
} from 'react';

const Icon = (
	props: SVGProps<SVGSVGElement>,
	ref: Ref<SVGSVGElement>,
	title: string,
	iconPath: JSX.Element
) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		stroke="currentColor"
		strokeLinecap="round"
		strokeLinejoin="round"
		strokeWidth={2}
		ref={ref}
		{...props}
	>
		<title>{title}</title>
		{iconPath}
	</svg>
);

type LucideIconProps = SVGProps<SVGSVGElement> & {
	title: string;
	iconPath: JSX.Element;
};

export const LucideIcon = ({ title, iconPath }: LucideIconProps) => {
	const IconComponent = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
		(svgProps, ref) => Icon(svgProps, ref, title, iconPath)
	);
	return IconComponent as ElementType;
};
