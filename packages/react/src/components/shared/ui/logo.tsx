import type { SVGProps } from 'react';

interface C15TIconProps {
	title?: string;
	titleId?: string;
}

export const C15TIcon = ({
	title = 'c15t',
	titleId = 'c15t',
	...props
}: SVGProps<SVGSVGElement> & C15TIconProps) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 408 149"
		aria-labelledby={titleId}
		{...props}
	>
		<title id={titleId}>{title}</title>
		<path
			fill="currentColor"
			fillRule="evenodd"
			d="M74.133 14.042c-5.58 0-10.105 4.524-10.105 10.104 0 5.581 4.524 10.105 10.105 10.105 5.58 0 10.105-4.524 10.105-10.105 0-5.58-4.524-10.104-10.105-10.104ZM50.556 24.146C50.556 11.125 61.112.57 74.133.57 87.154.57 97.71 11.125 97.71 24.146c0 13.022-10.556 23.578-23.577 23.578-4.06 0-7.88-1.027-11.216-2.834L44.354 63.453a23.424 23.424 0 0 1 1.858 4.48h55.843c2.899-9.74 11.921-16.841 22.601-16.841 13.022 0 23.578 10.556 23.578 23.577 0 13.022-10.556 23.578-23.578 23.578-10.68 0-19.702-7.102-22.601-16.841H46.211a23.455 23.455 0 0 1-2.628 5.798l18.015 18.015a23.473 23.473 0 0 1 12.535-3.604c13.021 0 23.577 10.556 23.577 23.577 0 13.022-10.556 23.577-23.577 23.577-13.021 0-23.577-10.555-23.577-23.577 0-3.506.765-6.833 2.138-9.824l-19.26-19.26a23.49 23.49 0 0 1-9.823 2.139C10.588 98.247.032 87.69.032 74.669c0-13.021 10.556-23.577 23.577-23.577 4.061 0 7.882 1.026 11.217 2.834L53.39 35.364a23.473 23.473 0 0 1-2.834-11.218Zm63.996 50.523v.023c.012 5.57 4.531 10.082 10.104 10.082 5.581 0 10.105-4.524 10.105-10.105 0-5.58-4.524-10.104-10.105-10.104-5.573 0-10.092 4.511-10.104 10.082v.022ZM23.61 64.565c-5.58 0-10.104 4.524-10.104 10.104 0 5.58 4.524 10.105 10.104 10.105 5.581 0 10.105-4.524 10.105-10.105 0-5.58-4.524-10.104-10.105-10.104Zm40.418 60.627c0-5.581 4.524-10.104 10.105-10.104 5.58 0 10.105 4.523 10.105 10.104 0 5.581-4.524 10.105-10.105 10.105-5.58 0-10.105-4.524-10.105-10.105Z"
			clipRule="evenodd"
		/>
		<path
			fill="currentColor"
			d="M213.869 86.31c0-18.48 14.64-32.04 32.88-32.04 9 0 17.28 3 24.24 10.44l-8.88 9.24c-4.08-4.2-8.88-6.6-15.36-6.6-10.56 0-18.6 8.04-18.6 18.96 0 10.92 8.04 18.959 18.6 18.959 6.48 0 11.28-2.4 15.36-6.6l8.88 9.24c-6.96 7.44-15.24 10.44-24.24 10.44-18.24 0-32.88-13.56-32.88-32.04Zm70.372-39.72h-11.88V33.03h26.88v83.639h-15v-70.08Zm23.468 54.599 12.24-6.96c2.88 6.12 9.24 10.2 16.44 10.2 10.2 0 17.04-6.36 17.04-15.84s-6.48-15.84-16.2-15.84c-4.68 0-9.48 1.44-12.48 4.32l-10.8-2.88 7.8-41.16h40.56v13.56h-29.28l-3 15.12c2.52-1.08 5.52-1.56 8.76-1.56 17.76 0 29.52 11.28 29.52 28.32 0 17.76-12.72 29.64-31.92 29.64-12.6 0-23.52-6.84-28.68-16.92Zm72.386-31.92h-7.8V56.19h7.8V33.03h14.4v23.16h13.08v13.08h-13.08v47.4h-14.4v-47.4Z"
		/>
	</svg>
);

// Consent logo for c15t.dev domain
export const ConsentLogo = ({
	title = 'Consent',
	titleId = 'consent-logo',
	...props
}: SVGProps<SVGSVGElement> & C15TIconProps) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 595 97"
		aria-labelledby={titleId}
		className="consent-logo"
		{...props}
	>
		<title id={titleId}>{title}</title>
		<path
			fill="currentColor"
			fillRule="evenodd"
			d="M53.679 70.787c6.17 0 11.172-5.002 11.172-11.172 0-4.009-2.111-7.524-5.283-9.495a23.868 23.868 0 0 1 8.817-1.677c13.217 0 23.93 10.714 23.93 23.93s-10.713 23.93-23.93 23.93c-13.216 0-23.93-10.714-23.93-23.93 0-1.924.227-3.795.656-5.588a11.148 11.148 0 0 0 8.568 4.002Z"
			clipRule="evenodd"
		/>
		<path
			fill="currentColor"
			fillRule="evenodd"
			d="M1.118 74.716a68.462 68.462 0 0 1-.098-3.654c0-37.205 30.16-67.365 67.365-67.365s67.365 30.16 67.365 67.365c0 1.226-.032 2.444-.097 3.654h-21.927c.041-.776.061-1.557.061-2.343 0-24.531-19.887-44.418-44.418-44.418-24.532 0-44.418 19.887-44.418 44.418 0 .786.02 1.567.06 2.343H1.118Z"
			clipRule="evenodd"
		/>
		<path
			fill="currentColor"
			d="M566.424 36.6h-7.8V23.52h7.8V.36h14.4v23.16h13.08V36.6h-13.08V84h-14.4V36.6ZM497.535 23.52h14.28v8.64c2.76-5.76 9.6-9.84 18.36-9.84 14.52 0 22.92 9.36 22.92 24.24V84h-14.4V48.6c0-8.16-4.68-13.44-12.84-13.44s-14.04 5.76-14.04 14.04V84h-14.28V23.52ZM429.265 53.76c0-19.44 13.56-31.92 31.68-31.92 18 0 29.88 13.56 29.88 30.48 0 0 0 2.64-.24 5.04h-47.04c.48 9.6 7.56 15.84 18.24 15.84 7.32 0 11.76-2.4 16.32-6.96l8.64 8.4c-7.8 8.28-16.32 10.8-25.44 10.8-18.96 0-32.04-12.24-32.04-31.2v-.48Zm46.92-6.48c0-7.2-6.84-13.2-15.24-13.2-9 0-16.44 5.88-17.04 13.2h32.28ZM385.367 65.52c2.52 4.08 8.159 7.56 15.959 7.56 8.28 0 10.8-3.48 10.8-6.6 0-5.04-7.2-6.24-16.56-9.6-8.88-3.24-14.88-7.8-14.88-17.04 0-11.64 9.84-18.12 21.36-18.12 10.08 0 16.8 3.84 21 9.12l-8.039 8.52c-2.521-3-6.6-5.28-13.2-5.28-4.56 0-7.321 2.16-7.321 5.4 0 4.56 5.041 5.16 15.241 8.88 11.16 3.96 16.199 9.24 16.199 18 0 10.44-7.559 19.2-24.839 19.2-12.6 0-21.241-5.04-24.961-12.24l9.241-7.8ZM315.997 23.52h14.28v8.64c2.76-5.76 9.6-9.84 18.36-9.84 14.52 0 22.92 9.36 22.92 24.24V84h-14.4V48.6c0-8.16-4.68-13.44-12.84-13.44s-14.04 5.76-14.04 14.04V84h-14.28V23.52ZM242.806 53.76c0-18.12 14.64-32.04 33-32.04 18.24 0 33 13.92 33 32.04 0 18.12-14.76 32.04-33 32.04-18.36 0-33-13.92-33-32.04Zm14.28 0c0 10.68 8.04 18.96 18.72 18.96 10.56 0 18.72-8.28 18.72-18.96 0-10.68-8.16-18.96-18.72-18.96-10.68 0-18.72 8.28-18.72 18.96ZM183.387 53.64c0-18.48 14.64-32.04 32.88-32.04 9 0 17.28 3 24.24 10.44l-8.88 9.24c-4.08-4.2-8.88-6.6-15.36-6.6-10.56 0-18.6 8.04-18.6 18.96 0 10.92 8.04 18.96 18.6 18.96 6.48 0 11.28-2.4 15.36-6.6l8.88 9.24c-6.96 7.44-15.24 10.44-24.24 10.44-18.24 0-32.88-13.56-32.88-32.04Z"
		/>
	</svg>
);
