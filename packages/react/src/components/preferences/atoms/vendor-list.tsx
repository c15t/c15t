import type { AllConsentNames } from '@c15t/core';
import vendorListStyles from '@c15t/ui/styles/components/vendor-list';
import { useId, useState } from 'react';

import { useConsentManager } from '~/component-hooks/use-manager';
import { useTranslations } from '~/component-hooks/use-translations';
import { Box } from '~/components/shared/primitives/box';
import type { BoxProps } from '~/components/shared/primitives/box';
import * as PreferenceItem from '~/components/shared/ui/preference-item';
import * as RadixSwitch from '~/components/shared/ui/switch';
import { useTheme } from '~/hooks/use-theme';

export interface ConsentWidgetVendorListProps extends Omit<
	BoxProps,
	'children' | 'slotKey'
> {
	/** Category whose vendors to list. */
	category: AllConsentNames;
	/** Start with the vendor rows shown. Collapsed by default. */
	defaultOpen?: boolean;
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

/**
 * Vendor rows nested inside one category's accordion content, behind a
 * collapsed trigger of their own so a long list does not fill the panel
 * until the visitor asks for it.
 *
 * Renders nothing when the category has no presentable vendor or the model
 * is `iab`. Each row is a switch that stages a per-vendor grant on the same
 * draft the category switches use; nothing is recorded until Save. While the
 * parent category is off in the draft, the vendor switches are disabled: a
 * vendor toggle never grants a category on its own. A `disabled` vendor is
 * listed without a switch.
 *
 * @param props - The category whose vendors to list, plus `Box` attributes.
 * @returns The vendor group, or `null` when there is nothing to list.
 * @public
 */
export const ConsentWidgetVendorList = ({
	category,
	className,
	defaultOpen = false,
	noStyle,
	...props
}: ConsentWidgetVendorListProps) => {
	const {
		getDisplayedVendors,
		selectedConsents,
		selectedVendors,
		setSelectedVendor,
	} = useConsentManager();
	const { consentManagerDialog } = useTranslations();
	const { noStyle: contextNoStyle } = useTheme();
	// Two surfaces can list the same vendor at once, an inline widget and an
	// open dialog for instance, so the label ids are scoped to this instance.
	const instanceId = useId();
	const [open, setOpen] = useState(defaultOpen);
	const finalNoStyle = noStyle ?? contextNoStyle;
	const vendors = getDisplayedVendors(category);
	if (vendors.length === 0) {
		return null;
	}
	const copy = { ...DEFAULT_COPY, ...consentManagerDialog.vendors };
	const categoryOn = selectedConsents[category] === true;
	const styles = finalNoStyle ? undefined : vendorListStyles;
	const title = copy.title.replace('{count}', String(vendors.length));

	return (
		<PreferenceItem.Root
			className={className}
			data-testid={`consent-widget-vendor-list-${category}`}
			noStyle={finalNoStyle}
			onOpenChange={setOpen}
			open={open}
			slotKey="vendor-list.root"
			{...props}
		>
			<PreferenceItem.Trigger
				className={styles?.trigger}
				data-testid={`consent-widget-vendor-trigger-${category}`}
				noStyle={finalNoStyle}
				slotKey="vendor-list.trigger"
			>
				<PreferenceItem.Leading
					className={styles?.arrow}
					noStyle={finalNoStyle}
				>
					<ToggleIcon open={open} />
				</PreferenceItem.Leading>
				<Box
					asChild
					noStyle={finalNoStyle}
					baseClassName={styles?.title}
					slotKey="vendor-list.title"
				>
					<span>{title}</span>
				</Box>
			</PreferenceItem.Trigger>
			<PreferenceItem.Content
				className={styles?.content}
				data-testid={`consent-widget-vendor-content-${category}`}
				innerClassName={styles?.contentInner}
				noStyle={finalNoStyle}
				slotKey="vendor-list.content"
			>
				{categoryOn ? null : (
					<p
						className={styles?.hint}
						data-testid={`consent-widget-vendor-hint-${category}`}
					>
						{copy.disabledByCategory}
					</p>
				)}
				{vendors.map((vendor) => {
					const name = vendor.name ?? vendor.id;
					const labelId = `${instanceId}vendor-${category}-${vendor.id}`;
					const checked = selectedVendors[vendor.id] ?? true;
					// A `disabled` vendor is presented without a toggle: the kernel
					// ignores grants for it, so a switch would only mislead.
					const toggleable = vendor.disabled !== true;
					return (
						<Box
							key={vendor.id}
							noStyle={finalNoStyle}
							baseClassName={styles?.item}
							data-testid={`consent-widget-vendor-item-${category}-${vendor.id}`}
							slotKey="vendor-list.item"
						>
							<Box
								noStyle={finalNoStyle}
								baseClassName={styles?.header}
								slotKey="vendor-list.header"
							>
								<Box
									asChild
									noStyle={finalNoStyle}
									baseClassName={styles?.name}
									slotKey="vendor-list.name"
								>
									<p id={labelId}>{name}</p>
								</Box>
								{vendor.description ? (
									<Box
										asChild
										noStyle={finalNoStyle}
										baseClassName={styles?.description}
										slotKey="vendor-list.description"
									>
										<p>{vendor.description}</p>
									</Box>
								) : null}
								{vendor.privacyPolicyUrl ? (
									<Box
										asChild
										noStyle={finalNoStyle}
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
							</Box>
							{toggleable ? (
								<Box
									noStyle={finalNoStyle}
									baseClassName={styles?.control}
									slotKey="vendor-list.control"
								>
									<RadixSwitch.Root
										aria-label={copy.switchLabel.replace('{vendor}', name)}
										aria-describedby={labelId}
										checked={checked}
										data-testid={`consent-widget-vendor-switch-${category}-${vendor.id}`}
										disabled={!categoryOn}
										onCheckedChange={(next) =>
											setSelectedVendor(vendor.id, next)
										}
										size="small"
									/>
								</Box>
							) : null}
						</Box>
					);
				})}
			</PreferenceItem.Content>
		</PreferenceItem.Root>
	);
};
