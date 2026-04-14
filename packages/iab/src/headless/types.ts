/**
 * Headless IAB types shared across all framework wrappers.
 *
 * @packageDocumentation
 */

export type HeadlessIABBannerAction = 'accept' | 'reject' | 'customize';
export type HeadlessIABDialogAction = 'accept' | 'reject' | 'customize';
export type HeadlessIABPreferenceTab = 'purposes' | 'vendors';

export interface HeadlessIABBannerState {
	/** Whether the banner summary is ready to display */
	isReady: boolean;
	/** Total vendor count (GVL + custom) */
	vendorCount: number;
	/** Display items (stacks, standalone purposes, special features) */
	displayItems: string[];
	/** Count of items not shown in the display list */
	remainingCount: number;
}

export interface HeadlessIABDialogState {
	/** Whether GVL is still loading */
	isLoading: boolean;
	/** Active preference center tab */
	activeTab: HeadlessIABPreferenceTab;
}
