import type { SVGProps } from 'react';

interface IconProps {
	title?: string;
	titleId?: string;
}

/**
 * c15t icon only (without text).
 * Use this for compact displays like the floating trigger.
 */
export const C15TIconOnly = ({
	title = 'c15t',
	titleId = 'c15t-icon',
	...props
}: SVGProps<SVGSVGElement> & IconProps) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 446 445"
		aria-labelledby={titleId}
		{...props}
	>
		<title id={titleId}>{title}</title>
		<path
			fill="currentColor"
			d="M223.178.313c39.064 0 70.732 31.668 70.732 70.732-.001 39.064-31.668 70.731-70.732 70.731-12.181 0-23.642-3.079-33.649-8.502l-55.689 55.689a70.267 70.267 0 0 1 5.574 13.441h167.531c8.695-29.217 35.762-50.523 67.804-50.523 39.064 0 70.731 31.668 70.731 70.732s-31.668 70.732-70.731 70.732c-32.042 0-59.108-21.306-67.803-50.523H139.413a70.417 70.417 0 0 1-7.888 17.396l54.046 54.046c10.893-6.851 23.786-10.815 37.605-10.815 39.064 0 70.732 31.669 70.732 70.733 0 39.064-31.668 70.731-70.732 70.731s-70.732-31.667-70.732-70.731c0-10.518 2.296-20.499 6.414-29.471l-57.78-57.78c-8.972 4.117-18.952 6.414-29.47 6.414-39.063 0-70.731-31.668-70.732-70.732 0-39.064 31.669-70.732 70.733-70.732 12.18 0 23.642 3.079 33.649 8.502l55.688-55.688c-5.423-10.007-8.502-21.469-8.502-33.65 0-39.064 31.668-70.733 70.732-70.733Zm0 343.555c-16.742 0-30.314 13.572-30.314 30.314 0 16.741 13.572 30.313 30.314 30.313s30.314-13.572 30.314-30.313c0-16.742-13.572-30.314-30.314-30.314ZM71.611 192.299c-16.742 0-30.315 13.572-30.315 30.314s13.573 30.314 30.315 30.314c16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314Zm303.138 0c-16.729 0-30.294 13.551-30.315 30.275l.001.039-.001.038c.021 16.725 13.586 30.276 30.315 30.276 16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314ZM223.178 40.73c-16.742 0-30.314 13.573-30.314 30.315s13.573 30.313 30.314 30.313c16.742 0 30.313-13.572 30.314-30.313 0-16.742-13.572-30.314-30.314-30.315Z"
		/>
	</svg>
);

const InthMark = ({
	title = 'INTH',
	titleId = 'inth-logo',
	...props
}: SVGProps<SVGSVGElement> & IconProps) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 88 90"
		fill="none"
		aria-labelledby={titleId}
		{...props}
	>
		<title id={titleId}>{title}</title>
		<path
			fill="currentColor"
			d="M40.9164 0V8.26444H27.6933V26.7966H40.9164V35.0608H6.15594V26.7966H19.3788V8.26444H6.15594V0H40.9164Z"
		/>
		<path
			fill="currentColor"
			d="M72.1149 20.1264V0H80.0343V35.0608H74.2747L54.9798 14.8193V35.0608H47.0604V0H52.964L72.1149 20.1264Z"
		/>
		<path
			fill="currentColor"
			fillRule="evenodd"
			clipRule="evenodd"
			d="M71.36 41.6H88V89.6H0V41.6H61.12V31.04L71.36 41.6ZM6.15594 48.0891V56.4034H19.1784V83.2H27.4428V56.4034H40.5656V48.0891H6.15594ZM47.0603 48.1391V83.2H55.3247V70.2441H71.7531V83.2H80.0675V48.1391H71.7531V61.9797H55.3247V48.1391H47.0603Z"
		/>
	</svg>
);

/**
 * INTH logo for partner branding displays.
 */
export const InthLogo = (props: SVGProps<SVGSVGElement> & IconProps) => (
	<InthMark
		titleId="inth-full-logo"
		{...props}
	/>
);

/**
 * INTH icon-only mark for compact placements like floating triggers.
 */
export const InthIconOnly = (props: SVGProps<SVGSVGElement> & IconProps) => (
	<InthMark
		titleId="inth-icon"
		{...props}
	/>
);

/**
 * Fingerprint icon for privacy/consent contexts.
 * A generic icon representing user identity and privacy.
 */
export const FingerprintIcon = ({
	title = 'Privacy',
	titleId = 'fingerprint-icon',
	...props
}: SVGProps<SVGSVGElement> & IconProps) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-labelledby={titleId}
		{...props}
	>
		<title id={titleId}>{title}</title>
		<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
		<path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
		<path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
		<path d="M2 12a10 10 0 0 1 18-6" />
		<path d="M2 16h.01" />
		<path d="M21.8 16c.2-2 .131-5.354 0-6" />
		<path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
		<path d="M8.65 22c.21-.66.45-1.32.57-2" />
		<path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
	</svg>
);

/**
 * Settings/gear icon for preference contexts.
 * A generic icon representing configuration and settings.
 */
export const SettingsIcon = ({
	title = 'Settings',
	titleId = 'settings-icon',
	...props
}: SVGProps<SVGSVGElement> & IconProps) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-labelledby={titleId}
		{...props}
	>
		<title id={titleId}>{title}</title>
		<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
		<circle
			cx="12"
			cy="12"
			r="3"
		/>
	</svg>
);
