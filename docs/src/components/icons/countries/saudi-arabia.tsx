import type { SVGProps } from 'react';

interface SaudiArabiaIconProps {
	title?: string;
	titleId?: string;
}

export const SaudiArabiaIcon = ({
	title = 'Saudi Arabia',
	titleId = 'saudi-arabia',
	...props
}: SVGProps<SVGSVGElement> & SaudiArabiaIconProps) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 260 218"
		aria-labelledby={titleId}
		{...props}
	>
		<title id={titleId}>{title}</title>
		<polygon
			fill="currentColor"
			fillRule="evenodd"
			clipRule="evenodd"
			points="250.62,128.396 218.465,126.096 186.381,89.436 183.314,74.268 175.622,69.836 164.337,52.104 140.28,45.323   119.649,43.718 69.834,5.548 55.937,2.385 29.891,9.31 40.937,23.591 16.401,39.788 2,42.808 5.547,54.501 28.885,104.196   43.884,120.202 48.892,132.278 48.221,149.003 66.048,167.788 96,215.615 101.798,202.101 154.872,207.276 164.169,192.852   176.533,186.334 213.193,179.961 251.291,164.41 258,136.711 "
		/>
	</svg>
);
