import type { AllConsentNames, ResolvedVendor } from '@c15t/core';
import { vendorsListedUnder } from '@c15t/core';
import vendorListStyles from '@c15t/ui/styles/components/vendor-list';
import { useId, useMemo, useState } from 'react';

import { useTranslations } from '~/component-hooks/use-translations';
import { Box } from '~/components/shared/primitives/box';
import type { BoxProps } from '~/components/shared/primitives/box';
import * as PreferenceItem from '~/components/shared/ui/preference-item';
import * as RadixSwitch from '~/components/shared/ui/switch';
import { useConsentDraftSlice, useConsentDraftStore } from '~/draft';
import { useDeclaredVendors } from '~/hooks';
import { useTheme } from '~/hooks/use-theme';

export interface ConsentWidgetVendorListProps extends Omit<
	BoxProps,
	'children' | 'slotKey'
> {
	/** Category whose vendors to list. */
	category: AllConsentNames;
}

/** Plus or minus, the same glyphs the category rows use. */
const ToggleIcon = ({ open }: { open: boolean }) => (
	<svg
		aria-hidden="true"
		fill="none"
		focusable="false"
		stroke="currentColor"
		strokeLinecap="round"
		strokeLinejoin="round"
		strokeWidth="2"
		viewBox="0 0 24 24"
	>
		<title>{open ? 'Close' : 'Open'}</title>
		{open ? <path d="M5 12h14" /> : <path d="M5 12h14M12 5v14" />}
	</svg>
);

const DEFAULT_COPY = {
	disabledByCategory: 'Turn on this category to choose vendors.',
	privacyPolicy: 'Privacy policy',
	switchLabel: 'Allow {vendor}',
	title: 'Vendors ({count})',
};

type Copy = typeof DEFAULT_COPY;

interface VendorRowProps {
	category: AllConsentNames;
	categoryOn: boolean;
	checked: boolean;
	copy: Copy;
	labelId: string;
	noStyle: boolean;
	onCheckedChange: (next: boolean) => void;
	styles: typeof vendorListStyles | undefined;
	vendor: ResolvedVendor;
}

/**
 * One vendor as a card of its own, shaped like a category row: the name and
 * switch on the header, the description and privacy policy link behind the
 * expand control. Collapsed by default so a long list stays one line per
 * vendor.
 */
const VendorRow = ({
	category,
	categoryOn,
	checked,
	copy,
	labelId,
	noStyle,
	onCheckedChange,
	styles,
	vendor,
}: VendorRowProps) => {
	const [open, setOpen] = useState(false);
	const name = vendor.name ?? vendor.id;
	// A `disabled` vendor is presented without a toggle: the kernel ignores
	// grants for it, so a switch would only mislead.
	const toggleable = vendor.disabled !== true;
	const hasDetails = Boolean(vendor.description || vendor.privacyPolicyUrl);

	return (
		<PreferenceItem.Root
			className={styles?.item}
			data-testid={`consent-widget-vendor-item-${category}-${vendor.id}`}
			disabled={!hasDetails}
			noStyle={noStyle}
			onOpenChange={setOpen}
			open={open}
			slotKey="vendor-list.item"
		>
			<Box
				noStyle={noStyle}
				baseClassName={styles?.header}
				slotKey="vendor-list.header"
			>
				<PreferenceItem.Trigger
					className={styles?.trigger}
					data-testid={`consent-widget-vendor-trigger-${category}-${vendor.id}`}
					noStyle={noStyle}
					slotKey="vendor-list.trigger"
				>
					<PreferenceItem.Leading
						className={styles?.arrow}
						noStyle={noStyle}
					>
						<ToggleIcon open={open} />
					</PreferenceItem.Leading>
					<Box
						asChild
						noStyle={noStyle}
						baseClassName={styles?.name}
						slotKey="vendor-list.name"
					>
						<span
							data-testid={`consent-widget-vendor-name-${category}-${vendor.id}`}
							id={labelId}
						>
							{name}
						</span>
					</Box>
				</PreferenceItem.Trigger>
				{toggleable ? (
					<Box
						noStyle={noStyle}
						baseClassName={styles?.control}
						slotKey="vendor-list.control"
					>
						<RadixSwitch.Root
							aria-label={copy.switchLabel.replace('{vendor}', name)}
							aria-describedby={labelId}
							checked={checked}
							data-testid={`consent-widget-vendor-switch-${category}-${vendor.id}`}
							disabled={!categoryOn}
							onCheckedChange={onCheckedChange}
							size="small"
						/>
					</Box>
				) : null}
			</Box>
			{hasDetails ? (
				<PreferenceItem.Content
					className={styles?.content}
					data-testid={`consent-widget-vendor-content-${category}-${vendor.id}`}
					innerClassName={styles?.contentInner}
					noStyle={noStyle}
					slotKey="vendor-list.content"
				>
					{vendor.description ? (
						<Box
							asChild
							noStyle={noStyle}
							baseClassName={styles?.description}
							slotKey="vendor-list.description"
						>
							<p>{vendor.description}</p>
						</Box>
					) : null}
					{vendor.privacyPolicyUrl ? (
						<Box
							asChild
							noStyle={noStyle}
							baseClassName={styles?.link}
							slotKey="vendor-list.link"
						>
							<a
								href={vendor.privacyPolicyUrl}
								rel="noopener noreferrer"
								target="_blank"
							>
								{copy.privacyPolicy}
							</a>
						</Box>
					) : null}
				</PreferenceItem.Content>
			) : null}
		</PreferenceItem.Root>
	);
};

/**
 * Vendor rows nested inside one category's accordion content, each a
 * collapsed card of its own that opens for its description and privacy
 * policy link. A long list stays one line per vendor.
 *
 * Renders nothing when the category has no presentable vendor or the model
 * is `iab`. Each row's switch stages a per-vendor grant on the same draft
 * the category switches use; nothing is recorded until Save. While the
 * parent category is off in the draft, the vendor switches are disabled: a
 * vendor toggle never grants a category on its own. A `disabled` vendor is
 * listed without a switch.
 *
 * @param props - The category whose vendors to list, plus `Box` attributes.
 * @returns The vendor list, or `null` when there is nothing to list.
 * @public
 */
export const ConsentWidgetVendorList = ({
	category,
	className,
	noStyle,
	...props
}: ConsentWidgetVendorListProps) => {
	const declaredVendors = useDeclaredVendors();
	// Presentable vendors whose category condition names this category.
	const vendors = useMemo(
		() => vendorsListedUnder(declaredVendors, category),
		[declaredVendors, category]
	);
	const draft = useConsentDraftStore();
	const categoryOn = useConsentDraftSlice(
		draft,
		(snapshot) => snapshot.values[category] === true
	);
	const selectedVendors = useConsentDraftSlice(
		draft,
		(snapshot) => snapshot.vendors
	);
	const { consentManagerDialog } = useTranslations();
	const { noStyle: contextNoStyle } = useTheme();
	// Two surfaces can list the same vendor at once, an inline widget and an
	// open dialog for instance, so the label ids are scoped to this instance.
	const instanceId = useId();
	const finalNoStyle = noStyle ?? contextNoStyle ?? false;
	if (vendors.length === 0) {
		return null;
	}
	const copy = { ...DEFAULT_COPY, ...consentManagerDialog.vendors };
	const styles = finalNoStyle ? undefined : vendorListStyles;
	const title = copy.title.replace('{count}', String(vendors.length));

	return (
		<Box
			asChild
			className={className}
			data-testid={`consent-widget-vendor-list-${category}`}
			noStyle={finalNoStyle}
			baseClassName={styles?.root}
			slotKey="vendor-list.root"
			{...props}
		>
			<section aria-label={title}>
				{categoryOn ? null : (
					<p
						className={styles?.hint}
						data-testid={`consent-widget-vendor-hint-${category}`}
					>
						{copy.disabledByCategory}
					</p>
				)}
				{vendors.map((vendor) => (
					<VendorRow
						key={vendor.id}
						category={category}
						categoryOn={categoryOn}
						checked={selectedVendors[vendor.id] ?? true}
						copy={copy}
						labelId={`${instanceId}vendor-${category}-${vendor.id}`}
						noStyle={finalNoStyle}
						onCheckedChange={(next) => draft.setVendor(vendor.id, next)}
						styles={styles}
						vendor={vendor}
					/>
				))}
			</section>
		</Box>
	);
};
