/**
 * The portable description of a consent screen.
 *
 * Every built-in consent UI -- React Native today, SwiftUI and Compose next --
 * draws from these shapes. A builder in this directory decides which screens
 * exist, which rows they hold, which switches are locked, and which actions sit
 * at parity. A renderer decides chrome only: fonts, spacing, the sheet, the
 * navigation bar. It never adds, drops, or reorders an action or a toggle.
 *
 * The shapes are plain JSON so the same scenarios can be checked against every
 * renderer from `native/ui/fixtures`. See `native/UI.md`.
 */

/** Ids of the actions a consent screen can offer. */
export const SCREEN_ACTION_IDS = [
	'acceptAll',
	'rejectAll',
	'save',
	'acknowledge',
	'manage',
] as const;

/** One of {@link SCREEN_ACTION_IDS}. */
export type ScreenActionId = (typeof SCREEN_ACTION_IDS)[number];

/**
 * How much visual weight an action carries.
 *
 * - `primary`: the one filled button that finishes the screen.
 * - `parity`: Accept and Reject on a first layer. Both get the same style,
 *   size, and color, because regulators read a weaker Reject as a dark pattern.
 * - `tonal`: secondary actions that still decide, shown as an equal pair.
 * - `text`: navigation, such as "Manage preferences".
 */
export const SCREEN_ACTION_EMPHASES = [
	'primary',
	'parity',
	'tonal',
	'text',
] as const;

/** One of {@link SCREEN_ACTION_EMPHASES}. */
export type ScreenActionEmphasis = (typeof SCREEN_ACTION_EMPHASES)[number];

/** A button at the bottom of a screen. */
export interface ScreenAction {
	/** What pressing it does. */
	readonly emphasis: ScreenActionEmphasis;
	/** Which decision or navigation it triggers. */
	readonly id: ScreenActionId;
	/** Visible label, in the subject's language. */
	readonly label: string;
}

/** A switch the subject can move, or one that is locked in place. */
export interface ScreenSwitchControl {
	/** Whether the switch is locked. */
	readonly disabled: boolean;
	readonly kind: 'switch';
	/** Position of the switch. */
	readonly value: boolean;
}

/** A read-only value shown at the trailing edge of a row. */
export interface ScreenValueControl {
	readonly kind: 'value';
	/** Text to show. */
	readonly text: string;
}

/** A row that opens a URL outside the app. */
export interface ScreenLinkControl {
	readonly kind: 'link';
	/** Where it goes. */
	readonly url: string;
}

/** What sits at the trailing edge of a row. */
export type ScreenControl =
	| ScreenLinkControl
	| ScreenSwitchControl
	| ScreenValueControl;

/** One row in a grouped list. */
export interface ScreenRow {
	/** Trailing control, if the row has one. */
	readonly control?: ScreenControl;
	/** Supporting text under the title. */
	readonly detail?: string;
	/**
	 * Row id. When the row has a switch, this is also the key the toggle writes,
	 * such as `category.marketing`, `purpose.1`, or `vendor.755.consent`.
	 */
	readonly id: string;
	/**
	 * An explanation the renderer shows on request, as a system alert opened
	 * from an info button.
	 */
	readonly info?: string;
	/** Screen id pushed when the row is pressed. */
	readonly navigatesTo?: string;
	/** Row label. */
	readonly title: string;
}

/** A group of rows. */
export interface ScreenSection {
	/** Text under the group. */
	readonly footer?: string;
	/** Text above the group. */
	readonly header?: string;
	/** Section id, stable across renders. */
	readonly id: string;
	/** Rows in display order. */
	readonly rows: readonly ScreenRow[];
}

/** One screen of a consent flow. */
export interface Screen {
	/** Buttons at the bottom, in display order. */
	readonly actions: readonly ScreenAction[];
	/** Lead-in for the "Secured by c15t" footnote. Absent when hidden. */
	readonly branding?: string;
	/** Shown in place of the sections when a search matches nothing. */
	readonly empty?: string;
	/** Screen id, also the route that opens it. */
	readonly id: string;
	/** Text under the title. */
	readonly intro?: string;
	/** Groups of rows. */
	readonly sections: readonly ScreenSection[];
	/** Heading, also the navigation bar title. */
	readonly title: string;
}
