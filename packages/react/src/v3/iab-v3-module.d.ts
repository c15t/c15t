declare module '@c15t/iab/v3' {
	import type { CMPApi, IABConfig } from '@c15t/core';
	import type {
		ConsentKernel,
		GlobalVendorList,
		NonIABVendor,
	} from '@c15t/core/v3';

	export interface CreateIABOptions extends Partial<
		Pick<IABConfig, 'cmpId' | 'cmpVersion' | 'vendors' | 'enabled'>
	> {
		kernel: ConsentKernel;
		gvl?: GlobalVendorList | null;
		gvlURL?: string;
		customVendors?: NonIABVendor[];
		publisherCountryCode?: string;
		isServiceSpecific?: boolean;
	}

	export interface IABHandle {
		readonly cmpApi: CMPApi | null;
		dispose: () => void;
		setVendorConsent: (id: string | number, value: boolean) => void;
		setVendorLegitimateInterest: (id: string | number, value: boolean) => void;
		setPurposeConsent: (id: number, value: boolean) => void;
		setPurposeLegitimateInterest: (id: number, value: boolean) => void;
		setSpecialFeatureOptIn: (id: number, value: boolean) => void;
		acceptAll: () => void;
		rejectAll: () => void;
		generateTCString: () => Promise<string>;
		save: () => Promise<void>;
	}

	export function createIAB(options: CreateIABOptions): IABHandle;
	export type { CMPApi, GlobalVendorList, NonIABVendor };
}

declare module '@c15t/iab/v3/headless' {
	import type { GlobalVendorList, NonIABVendor } from '@c15t/core/v3';

	export type HeadlessIABBannerAction = 'accept' | 'reject' | 'customize';
	export type HeadlessIABDialogAction = 'accept' | 'reject' | 'customize';
	export type HeadlessIABPreferenceTab = 'purposes' | 'vendors';
	export type HeadlessIABVendorId = number | string;

	export interface HeadlessIABStateInput {
		gvl: GlobalVendorList | null;
		isLoadingGVL?: boolean;
		nonIABVendors?: NonIABVendor[];
		customVendors?: NonIABVendor[];
	}

	export interface HeadlessIABBannerState {
		isReady: boolean;
		vendorCount: number;
		displayItems: string[];
		remainingCount: number;
	}

	export interface HeadlessIABDialogState {
		isLoading: boolean;
		activeTab: HeadlessIABPreferenceTab;
	}

	export interface HeadlessIABProcessedVendor {
		id: HeadlessIABVendorId;
		name: string;
		policyUrl: string;
		usesNonCookieAccess: boolean;
		deviceStorageDisclosureUrl: string | null;
		usesCookies: boolean;
		cookieMaxAgeSeconds: number | null;
		cookieRefresh?: boolean;
		specialPurposes: number[];
		specialFeatures: number[];
		features: number[];
		purposes: number[];
		legIntPurposes: number[];
		legitimateInterestUrl?: string | null;
		isCustom?: boolean;
		usesLegitimateInterest?: boolean;
		dataRetention?: {
			purposes?: Record<number, number>;
			specialPurposes?: Record<number, number>;
			stdRetention?: number;
		};
		dataDeclaration?: number[];
	}

	export interface HeadlessIABProcessedPurpose {
		id: number;
		name: string;
		description: string;
		descriptionLegal?: string;
		illustrations: string[];
		vendors: HeadlessIABProcessedVendor[];
		isSpecialPurpose?: boolean;
	}

	export interface HeadlessIABProcessedSpecialFeature {
		id: number;
		name: string;
		description: string;
		descriptionLegal?: string;
		illustrations: string[];
		vendors: HeadlessIABProcessedVendor[];
	}

	export interface HeadlessIABProcessedFeature {
		id: number;
		name: string;
		description: string;
		descriptionLegal?: string;
		illustrations: string[];
		vendors: HeadlessIABProcessedVendor[];
	}

	export interface HeadlessIABProcessedStack {
		id: number;
		name: string;
		description: string;
		purposes: HeadlessIABProcessedPurpose[];
	}

	export interface HeadlessIABDialogData {
		purposes: HeadlessIABProcessedPurpose[];
		specialPurposes: HeadlessIABProcessedPurpose[];
		specialFeatures: HeadlessIABProcessedSpecialFeature[];
		features: HeadlessIABProcessedFeature[];
		stacks: HeadlessIABProcessedStack[];
		standalonePurposes: HeadlessIABProcessedPurpose[];
		totalVendors: number;
		isLoading: boolean;
		isReady: boolean;
	}

	export type ProcessedGVLData = HeadlessIABDialogData;
	export type ProcessedVendor = HeadlessIABProcessedVendor;
	export type ProcessedPurpose = HeadlessIABProcessedPurpose;
	export type ProcessedSpecialFeature = HeadlessIABProcessedSpecialFeature;
	export type ProcessedFeature = HeadlessIABProcessedFeature;
	export type ProcessedStack = HeadlessIABProcessedStack;

	export function resolveIABBannerSummary(
		iab: HeadlessIABStateInput | null
	): HeadlessIABBannerState;

	export function processGVLForDialog(
		iab: HeadlessIABStateInput | null
	): HeadlessIABDialogData;
}
