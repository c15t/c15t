import type { AllConsentNames } from '@c15t/core';
import vendorListStyles from '@c15t/ui/styles/components/vendor-list';

import { useConsentManager } from '~/component-hooks/use-manager';
import { useTranslations } from '~/component-hooks/use-translations';
import { Box } from '~/components/shared/primitives/box';
import type { BoxProps } from '~/components/shared/primitives/box';
import * as RadixSwitch from '~/components/shared/ui/switch';
import { useTheme } from '~/hooks/use-theme';

export interface ConsentWidgetVendorListProps extends Omit<
	BoxProps,
	'children' | 'slotKey'
> {
	/** Category whose vendors to list. */
	category: AllConsentNames;
}

const DEFAULT_COPY = {
	disabledByCategory: 'Turn on this category to choose vendors.',
	privacyPolicy: 'Privacy policy',
	switchLabel: 'Allow {vendor}',
	title: 'Vendors',
};

/**
 * Vendor rows nested inside one category's accordion content.
 *
 * Renders nothing when the category has no presentable vendor or the model
 * is `iab`. Each row is a switch that stages a per-vendor grant on the same
 * draft the category switches use; nothing is recorded until Save. While the
 * parent category is off in the draft, the vendor switches are disabled: a
 * vendor toggle never grants a category on its own.
 */
export const ConsentWidgetVendorList = ({
	category,
	className,
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
	const finalNoStyle = noStyle ?? contextNoStyle;
	const vendors = getDisplayedVendors(category);
	if (vendors.length === 0) {
		return null;
	}
	const copy = { ...DEFAULT_COPY, ...consentManagerDialog.vendors };
	const categoryOn = selectedConsents[category] === true;
	const styles = finalNoStyle ? undefined : vendorListStyles;

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
			<fieldset>
				<Box
					asChild
					noStyle={finalNoStyle}
					baseClassName={styles?.title}
					slotKey="vendor-list.title"
				>
					<legend>{copy.title}</legend>
				</Box>
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
					const checked = selectedVendors[vendor.id] ?? true;
					const disabled = !categoryOn || vendor.disabled === true;
					return (
						<Box
							key={vendor.id}
							noStyle={finalNoStyle}
							baseClassName={styles?.item}
							data-testid={`consent-widget-vendor-item-${vendor.id}`}
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
									<p id={`c15t-vendor-${category}-${vendor.id}`}>{name}</p>
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
							<Box
								noStyle={finalNoStyle}
								baseClassName={styles?.control}
								slotKey="vendor-list.control"
							>
								<RadixSwitch.Root
									aria-label={copy.switchLabel.replace('{vendor}', name)}
									aria-describedby={`c15t-vendor-${category}-${vendor.id}`}
									checked={checked}
									data-testid={`consent-widget-vendor-switch-${vendor.id}`}
									disabled={disabled}
									onCheckedChange={(next) => setSelectedVendor(vendor.id, next)}
									size="small"
								/>
							</Box>
						</Box>
					);
				})}
			</fieldset>
		</Box>
	);
};
