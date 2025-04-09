import type { SVGProps } from 'react';

interface SingaporeIconProps {
	title?: string;
	titleId?: string;
}

export const SingaporeIcon = ({
	title = 'Singapore',
	titleId = 'singapore',
	...props
}: SVGProps<SVGSVGElement> & SingaporeIconProps) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 260 134"
		aria-labelledby={titleId}
		{...props}
	>
		<title id={titleId}>{title}</title>

		<path
			fill="currentColor"
			fillRule="evenodd"
			clipRule="evenodd"
			d="M254.046,48.137l-15.32,6.425l-7.907-14.826h-4.448V29.357l13.838-4.448l13.838,4.448l3.954,5.931L254.046,48.137z   M104.465,114.032h26.358l21.745-14.826l43.82-13.508l23.488-2.409l8.801-19.666l-14.662-5.107l-3.459-10.873l-12.355-2.471  l-7.413,7.413l-12.355-2.471l-3.954-9.06l-9.884-11.696l-7.907,2.965l-12.849-7.413l-11.861,0.988l5.436-7.413L115.173,2.176  h-10.708l-23.887,18.78l-24.216-9.39L34.123,25.898l-8.896,22.734h4.378l-1.801,7.816l-12.462,7.01l6.009,6.009l-9.61,1.911  L1.998,97.064l1.743,4.016l-1.743,15.752L18.769,105.5l-1.467-10.725l3.678-2.452l7.458,7.458l17.05-7.99l35.089,4.777  L104.465,114.032z M68.223,109.749l-8.237-9.225H38.9l-16.474,11.202v1.977l7.907,12.849h7.248L68.223,109.749z M105.961,118.789  l11.12,11.863l8.649,1.171l4.666-10.076L105.961,118.789z M195.495,37.162V32.22h5.93v-5.334l-13.179-1.585l-16.474-4.675v4.675  l12.849,5.601v6.26H195.495z"
		/>
	</svg>
);
