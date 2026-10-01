// Reference code for the vendor consent page. No page in this example imports
// it; `bun run check-types` compiles it with the rest of the app.
// #region docs:vendor-consent title="src/vendor-consent.ts"
import { isVendorAllowed } from 'c15t';
import type { SaveResult, Vendor } from 'c15t';
import type { ConsentRuntime } from 'c15t/runtime';

export const vendors: Vendor[] = [
	{
		category: 'marketing',
		id: 'x-pixel',
		name: 'X Pixel',
		privacyPolicyUrl: 'https://x.com/privacy',
	},
];

// Whether the vendor may run now: it is declared, its category is allowed
// and the visitor has not switched it off. An undeclared id returns false.
export const canVendorRun = function canVendorRun(
	runtime: ConsentRuntime,
	vendorId: string
): boolean {
	return isVendorAllowed(runtime.kernel.getSnapshot(), vendorId);
};

// Record one vendor switch. `save({})` records only the staged vendor;
// `save()` with no argument would also confirm every displayed category.
export const saveVendorSwitch = function saveVendorSwitch(
	runtime: ConsentRuntime,
	vendorId: string,
	granted: boolean
): Promise<SaveResult> {
	runtime.stageVendorConsent(vendorId, granted);
	return runtime.kernel.commands.save({});
};
// #endregion docs:vendor-consent
