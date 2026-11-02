import type { LegalLinks, Model } from '@c15t/core';

/** Props for the trigger `ConsentDialog` renders when `showTrigger` is set. */
export interface ConsentDialogTriggerProps {
	defaultPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
	persistPosition?: boolean;
	showWhen?: 'always' | 'never';
	size?: 'sm' | 'md' | 'lg';
	ariaLabel?: string;
	noStyle?: boolean;
	class?: string;
}

/** Props for `ConsentDialog`. */
export interface ConsentDialogProps {
	open?: boolean;
	noStyle?: boolean;
	/**
	 * Skip the enter and exit animations. Defaults to the provider's
	 * `disableAnimation`, which follows `prefers-reduced-motion`.
	 */
	disableAnimation?: boolean;
	hideBranding?: boolean;
	legalLinks?: (keyof LegalLinks)[] | null;
	/**
	 * Show a close button in the dialog header. Clicking it closes the
	 * dialog without recording consent, like Escape.
	 * @default false
	 */
	showCloseButton?: boolean;
	showTrigger?: boolean | ConsentDialogTriggerProps;
	models?: Model[];
	class?: string;
}
