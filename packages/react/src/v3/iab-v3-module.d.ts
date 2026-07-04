declare module '@c15t/iab/v3' {
	import type { CMPApi, IABConfig } from 'c15t';
	import type { ConsentKernel, GlobalVendorList, NonIABVendor } from 'c15t/v3';

	export interface CreateIABOptions
		extends Partial<
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
		dispose(): void;
		setVendorConsent(id: string | number, value: boolean): void;
		setVendorLegitimateInterest(id: string | number, value: boolean): void;
		setPurposeConsent(id: number, value: boolean): void;
		setPurposeLegitimateInterest(id: number, value: boolean): void;
		setSpecialFeatureOptIn(id: number, value: boolean): void;
		acceptAll(): void;
		rejectAll(): void;
		generateTCString(): Promise<string>;
		save(): Promise<void>;
	}

	export function createIAB(options: CreateIABOptions): IABHandle;
	export type { CMPApi, GlobalVendorList, NonIABVendor };
}
