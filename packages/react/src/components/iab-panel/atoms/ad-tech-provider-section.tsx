'use client';

import type { AdTechProvider } from '@c15t/core';
import styles from '@c15t/ui/styles/components/iab-consent-dialog';
import type { FC } from 'react';

import * as Switch from '~/components/shared/ui/switch';
import { useTheme } from '~/hooks/use-theme';
import { useUIConfig } from '~/ui-config-context';
import { mergeSlotProps } from '~/utils/merge-slot-props';

import type { VendorId } from '../types';
import { useIABTranslations } from '../use-iab-translations';

/**
 * Providers matching the vendor search. A vendor selected from the Purposes
 * tab is never an ad tech provider, since providers process no TCF
 * purposes, so a selection hides them all.
 */
export const filterAdTechProviders = function filterAdTechProviders(
	providers: AdTechProvider[],
	searchTerm: string,
	selectedVendorId: VendorId | null
): AdTechProvider[] {
	if (selectedVendorId !== null) {
		return [];
	}
	const query = searchTerm.toLowerCase();
	return providers.filter((provider) =>
		provider.name.toLowerCase().includes(query)
	);
};

interface AdTechProviderSectionProps {
	/** Providers to list, already filtered by the vendor search. */
	providers: AdTechProvider[];
	/** Consent switches keyed by provider ID. */
	consents: Record<string, boolean>;
	onToggle?: (providerId: number, value: boolean) => void;
}

/**
 * Google Additional Consent providers in the vendor list. Each row shows the
 * provider's name and privacy policy without expanding, which is what the
 * Additional Consent spec requires before a provider counts as disclosed.
 */
export const AdTechProviderSection: FC<AdTechProviderSectionProps> = ({
	providers,
	consents,
	onToggle,
}) => {
	const { components } = useUIConfig();
	const { noStyle } = useTheme();
	const iab = useIABTranslations();
	if (providers.length === 0) {
		return null;
	}
	const { vendorList } = iab.preferenceCenter;
	const rowHeaderProps = mergeSlotProps(
		components?.['iab-vendor-list']?.rowHeader,
		{
			baseClassName: styles.vendorListItemHeader,
			noStyle,
		}
	);

	return (
		<div className={noStyle ? undefined : styles.vendorSection}>
			<div className={noStyle ? undefined : styles.customVendorSectionHeader}>
				<h3 className={noStyle ? undefined : styles.vendorSectionHeading}>
					<svg
						className={noStyle ? undefined : styles.vendorSectionIcon}
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						aria-hidden="true"
					>
						<circle
							cx="18"
							cy="5"
							r="3"
						/>
						<circle
							cx="6"
							cy="12"
							r="3"
						/>
						<circle
							cx="18"
							cy="19"
							r="3"
						/>
						<line
							x1="8.59"
							y1="13.51"
							x2="15.42"
							y2="17.49"
						/>
						<line
							x1="15.41"
							y1="6.51"
							x2="8.59"
							y2="10.49"
						/>
					</svg>
					{vendorList.adTechProvidersHeading} ({providers.length})
				</h3>
				<p className={noStyle ? undefined : styles.customVendorNotice}>
					{vendorList.adTechProvidersNotice}
				</p>
			</div>
			<div>
				{providers.map((provider) => {
					const providerKey = String(provider.id);
					return (
						<div
							key={providerKey}
							id={`ad-tech-provider-${providerKey}`}
							className={noStyle ? undefined : styles.vendorListItem}
						>
							<div {...rowHeaderProps}>
								<div className={noStyle ? undefined : styles.vendorListInfo}>
									<h3 className={noStyle ? undefined : styles.vendorListName}>
										{provider.name}
									</h3>
									<div className={noStyle ? undefined : styles.vendorListMeta}>
										<a
											href={provider.policyUrl}
											target="_blank"
											rel="noopener noreferrer"
											className={noStyle ? undefined : styles.vendorLink}
										>
											<svg
												className={noStyle ? undefined : styles.vendorLinkIcon}
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												aria-hidden="true"
											>
												<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
												<polyline points="15 3 21 3 21 9" />
												<line
													x1="10"
													y1="14"
													x2="21"
													y2="3"
												/>
											</svg>
											{vendorList.privacyPolicy}
										</a>
									</div>
								</div>
								<div
									className={noStyle ? undefined : styles.vendorConsentControl}
								>
									<Switch.Root
										aria-label={`Consent for ${provider.name}`}
										className={noStyle ? undefined : styles.vendorConsentSwitch}
										checked={consents[providerKey] ?? false}
										onCheckedChange={(value) => onToggle?.(provider.id, value)}
									/>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
