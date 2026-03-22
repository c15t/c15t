'use client';

import styles from '@c15t/ui/styles/components/iab-consent-dialog.module.js';
import type { GlobalVendorList } from 'c15t';
import { type FC, useEffect, useState } from 'react';
import * as Collapsible from '~/components/shared/ui/collapsible';
import * as Switch from '~/components/shared/ui/switch';
import type { ProcessedPurpose, ProcessedVendor, VendorId } from '../types';
import { useIABTranslations } from '../use-iab-translations';

/** Custom vendor not registered with IAB */
interface CustomVendor {
	id: string | number;
	name: string;
	privacyPolicyUrl: string;
	purposes: number[];
	legIntPurposes?: number[];
	specialFeatures?: number[];
	features?: number[];
	dataCategories?: number[];
	usesCookies?: boolean;
	usesNonCookieAccess?: boolean;
	cookieMaxAgeSeconds?: number;
}

interface VendorListProps {
	vendorData: GlobalVendorList | null;
	purposes: ProcessedPurpose[];
	vendorConsents: Record<string, boolean>;
	onVendorToggle: (vendorId: VendorId, value: boolean) => void;
	selectedVendorId: VendorId | null;
	onClearSelection: () => void;
	customVendors?: CustomVendor[];
	/** Legitimate interest state - true means user has NOT objected (allowed) */
	vendorLegitimateInterests?: Record<string, boolean>;
	/** Handler for legitimate interest objection toggle */
	onVendorLegitimateInterestToggle?: (
		vendorId: VendorId,
		value: boolean
	) => void;
}

export const VendorList: FC<VendorListProps> = ({
	vendorData,
	purposes,
	vendorConsents,
	onVendorToggle,
	selectedVendorId,
	onClearSelection,
	customVendors = [],
	vendorLegitimateInterests = {},
	onVendorLegitimateInterestToggle,
}) => {
	const [searchTerm, setSearchTerm] = useState('');
	const [expandedVendors, setExpandedVendors] = useState<Set<VendorId>>(
		new Set()
	);
	const iab = useIABTranslations();

	// Map IAB vendors
	const iabVendors: ProcessedVendor[] = vendorData
		? Object.entries(vendorData.vendors).map(([id, vendor]) => ({
				id: Number(id),
				name: vendor.name,
				policyUrl:
					(vendor as unknown as { policyUrl?: string }).policyUrl ?? '',
				usesNonCookieAccess: vendor.usesNonCookieAccess,
				deviceStorageDisclosureUrl: vendor.deviceStorageDisclosureUrl ?? null,
				usesCookies: vendor.usesCookies,
				cookieMaxAgeSeconds: vendor.cookieMaxAgeSeconds,
				cookieRefresh: vendor.cookieRefresh,
				specialPurposes: vendor.specialPurposes || [],
				specialFeatures: vendor.specialFeatures || [],
				features: vendor.features || [],
				purposes: vendor.purposes || [],
				legIntPurposes: vendor.legIntPurposes || [],
				isCustom: false,
				legitimateInterestUrl:
					vendor.urls?.find((url) => url.legIntClaim)?.legIntClaim ?? null,
				dataRetention: vendor.dataRetention,
				dataDeclaration:
					(vendor as unknown as { dataDeclaration?: number[] })
						.dataDeclaration || [],
			}))
		: [];

	// Map custom/non-IAB vendors
	const mappedCustomVendors: ProcessedVendor[] = customVendors.map((cv) => ({
		id: cv.id,
		name: cv.name,
		policyUrl: cv.privacyPolicyUrl,
		usesNonCookieAccess: cv.usesNonCookieAccess ?? false,
		deviceStorageDisclosureUrl: null,
		usesCookies: cv.usesCookies ?? false,
		cookieMaxAgeSeconds: cv.cookieMaxAgeSeconds ?? null,
		cookieRefresh: undefined,
		specialPurposes: [],
		specialFeatures: cv.specialFeatures || [],
		features: cv.features || [],
		purposes: cv.purposes || [],
		legIntPurposes: cv.legIntPurposes || [],
		isCustom: true,
		legitimateInterestUrl: null,
		dataRetention: undefined,
		dataDeclaration: cv.dataCategories || [],
	}));

	// Combine and sort all vendors
	const vendors: ProcessedVendor[] = [
		...iabVendors,
		...mappedCustomVendors,
	].sort((a, b) => a.name.localeCompare(b.name));

	useEffect(() => {
		if (selectedVendorId !== null) {
			setExpandedVendors((prev) => new Set(prev).add(selectedVendorId));
			setTimeout(() => {
				const element = document.getElementById(
					`vendor-${String(selectedVendorId)}`
				);
				if (element) {
					element.scrollIntoView({ behavior: 'smooth', block: 'start' });
				}
			}, 100);
		}
	}, [selectedVendorId]);

	const filteredVendors =
		selectedVendorId !== null
			? vendors.filter((v) => String(v.id) === String(selectedVendorId))
			: vendors.filter((vendor) =>
					vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
				);

	// Separate IAB and custom vendors for display
	const filteredIABVendors = filteredVendors.filter((v) => !v.isCustom);
	const filteredCustomVendors = filteredVendors.filter((v) => v.isCustom);

	const toggleVendor = (vendorId: VendorId) => {
		setExpandedVendors((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(vendorId)) {
				newSet.delete(vendorId);
			} else {
				newSet.add(vendorId);
			}
			return newSet;
		});
	};

	const getVendorPurposes = (vendorId: VendorId) => {
		const vendor = vendors.find((v) => String(v.id) === String(vendorId));
		if (!vendor) {
			return [];
		}

		return purposes
			.filter((purpose) =>
				purpose.vendors.some((v) => String(v.id) === String(vendorId))
			)
			.map((purpose) => ({
				...purpose,
				usesLegitimateInterest: vendor.legIntPurposes.includes(purpose.id),
			}));
	};

	const getVendorSpecialPurposes = (vendorId: VendorId) => {
		const vendor = vendors.find((v) => String(v.id) === String(vendorId));
		if (!vendor || !vendorData) {
			return [];
		}

		return vendor.specialPurposes
			.map((id) => vendorData.specialPurposes[id])
			.filter((sp): sp is NonNullable<typeof sp> => sp != null)
			.map((sp) => ({
				id: sp.id,
				name: sp.name,
				description: sp.description,
			}));
	};

	const getVendorSpecialFeatures = (vendorId: VendorId) => {
		const vendor = vendors.find((v) => String(v.id) === String(vendorId));
		if (!vendor || !vendorData) {
			return [];
		}

		return vendor.specialFeatures
			.map((id) => vendorData.specialFeatures[id])
			.filter((sf): sf is NonNullable<typeof sf> => sf != null)
			.map((sf) => ({
				id: sf.id,
				name: sf.name,
				description: sf.description,
			}));
	};

	const getVendorFeatures = (vendorId: VendorId) => {
		const vendor = vendors.find((v) => String(v.id) === String(vendorId));
		if (!vendor || !vendorData) {
			return [];
		}

		return (vendor.features || [])
			.map((id) => vendorData.features[id])
			.filter((f): f is NonNullable<typeof f> => f != null)
			.map((f) => ({
				id: f.id,
				name: f.name,
				description: f.description,
			}));
	};

	return (
		<div>
			{selectedVendorId !== null ? (
				<div className={styles.selectedVendorBanner}>
					<p className={styles.selectedVendorText}>
						{iab.common.showingSelectedVendor}
					</p>
					<button
						type="button"
						onClick={onClearSelection}
						className={styles.clearSelectionButton}
					>
						<svg
							className={styles.clearIcon}
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
						{iab.common.clearSelection}
					</button>
				</div>
			) : (
				<div className={styles.vendorListHeader}>
					<div className={styles.searchContainer}>
						<svg
							className={styles.searchIcon}
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<circle cx="11" cy="11" r="8" />
							<line x1="21" y1="21" x2="16.65" y2="16.65" />
						</svg>
						<input
							type="text"
							placeholder={iab.preferenceCenter.vendorList.search}
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className={styles.searchInput}
						/>
					</div>
					<p className={styles.vendorCount}>
						{iab.preferenceCenter.vendorList.showingCount
							.replace('{filtered}', String(filteredVendors.length))
							.replace('{total}', String(vendors.length))}
					</p>
				</div>
			)}

			{/* IAB Registered Vendors */}
			{filteredIABVendors.length > 0 && (
				<div className={styles.vendorSection}>
					<div className={styles.iabVendorSectionHeader}>
						<h3 className={styles.vendorSectionHeading}>
							<svg
								className={styles.vendorSectionIcon}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="M12 2L2 7l10 5 10-5-10-5z" />
								<path d="M2 17l10 5 10-5" />
								<path d="M2 12l10 5 10-5" />
							</svg>
							{iab.preferenceCenter.vendorList.iabVendorsHeading} (
							{filteredIABVendors.length})
						</h3>
						<p className={styles.iabVendorNotice}>
							{iab.preferenceCenter.vendorList.iabVendorsNotice}
						</p>
					</div>
					<div>
						{filteredIABVendors.map((vendor) => renderVendorItem(vendor))}
					</div>
				</div>
			)}

			{/* Custom/Non-IAB Vendors */}
			{filteredCustomVendors.length > 0 && (
				<div className={styles.vendorSection}>
					<div className={styles.customVendorSectionHeader}>
						<h3 className={styles.vendorSectionHeading}>
							<svg
								className={styles.vendorSectionIcon}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<circle cx="12" cy="12" r="10" />
								<line x1="2" y1="12" x2="22" y2="12" />
								<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
							</svg>
							{iab.preferenceCenter.vendorList.customVendorsHeading} (
							{filteredCustomVendors.length})
						</h3>
						<p className={styles.customVendorNotice}>
							{iab.preferenceCenter.vendorList.customVendorsNotice}
						</p>
					</div>
					<div>
						{filteredCustomVendors.map((vendor) => renderVendorItem(vendor))}
					</div>
				</div>
			)}

			{filteredVendors.length === 0 && (
				<div className={styles.emptyState}>
					<p className={styles.emptyStateText}>
						No vendors found matching "{searchTerm}"
					</p>
				</div>
			)}
		</div>
	);

	function renderVendorItem(vendor: ProcessedVendor) {
		const vendorKey = String(vendor.id);
		const vendorPurposes = getVendorPurposes(vendor.id);
		const vendorSpecialPurposes = getVendorSpecialPurposes(vendor.id);
		const vendorSpecialFeatures = getVendorSpecialFeatures(vendor.id);
		const vendorFeatures = getVendorFeatures(vendor.id);
		const isExpanded = expandedVendors.has(vendor.id);
		const legIntCount = vendorPurposes.filter(
			(p) => p.usesLegitimateInterest
		).length;
		const hasLegitimateInterest = vendor.legIntPurposes.length > 0;
		const isLegitimateInterestAllowed =
			vendorLegitimateInterests[vendorKey] ?? true;
		const standardRetentionDays = vendor.dataRetention?.stdRetention;
		let maxAgeText: string | null = null;

		if (vendor.cookieMaxAgeSeconds) {
			maxAgeText = iab.preferenceCenter.vendorList.maxAge.replace(
				'{days}',
				String(Math.floor(vendor.cookieMaxAgeSeconds / 86400))
			);
			if (vendor.cookieRefresh) {
				maxAgeText = `${maxAgeText} (refreshes)`;
			}
		}

		return (
			<div
				key={vendor.id}
				id={`vendor-${vendorKey}`}
				className={`${styles.vendorListItem} ${vendor.isCustom ? styles.customVendorItem : ''}`}
			>
				<div className={styles.vendorListItemHeader}>
					<button
						type="button"
						onClick={() => toggleVendor(vendor.id)}
						className={styles.vendorListTrigger}
					>
						<div className={styles.vendorListInfo}>
							<h3 className={styles.vendorListName}>
								{vendor.name}
								{vendor.isCustom && (
									<svg
										className={styles.customVendorIcon}
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										aria-label={iab.common.customPartner}
									>
										<circle cx="12" cy="12" r="10" />
										<line x1="2" y1="12" x2="22" y2="12" />
										<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
									</svg>
								)}
							</h3>
							<div className={styles.vendorListMeta}>
								<span className={styles.vendorListMetaText}>
									{vendorPurposes.length} purpose
									{vendorPurposes.length !== 1 ? 's' : ''}
									{vendorSpecialPurposes.length > 0 &&
										`, ${vendorSpecialPurposes.length} special`}
									{vendorSpecialFeatures.length > 0 &&
										`, ${vendorSpecialFeatures.length} feature${
											vendorSpecialFeatures.length !== 1 ? 's' : ''
										}`}
								</span>
								{legIntCount > 0 && (
									<span className={styles.vendorListLIBadge}>
										<svg
											style={{ width: '0.625rem', height: '0.625rem' }}
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
										>
											<path d="M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
										</svg>
										{legIntCount}{' '}
										{iab.preferenceCenter.vendorList.legitimateInterest}
									</span>
								)}
							</div>
						</div>
						<svg
							className={styles.purposeArrow}
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							{isExpanded ? (
								<path d="M19 15l-7-7-7 7" />
							) : (
								<path d="M19 9l-7 7-7-7" />
							)}
						</svg>
					</button>
					<div className={styles.vendorConsentControl}>
						<Switch.Root
							aria-label={`Consent for ${vendor.name}`}
							className={styles.vendorConsentSwitch}
							checked={vendorConsents[vendorKey] ?? false}
							onCheckedChange={(value) => onVendorToggle(vendor.id, value)}
						/>
					</div>
				</div>

				<Collapsible.Root noStyle open={isExpanded}>
					<Collapsible.Content
						innerClassName={styles.vendorListContent}
						noStyle
					>
						<div className={styles.vendorLinks}>
							<a
								href={vendor.policyUrl}
								target="_blank"
								rel="noopener noreferrer"
								className={styles.vendorLink}
							>
								<svg
									className={styles.vendorLinkIcon}
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
									<polyline points="15 3 21 3 21 9" />
									<line x1="10" y1="14" x2="21" y2="3" />
								</svg>
								{iab.preferenceCenter.vendorList.privacyPolicy}
							</a>
							{vendor.legitimateInterestUrl && (
								<a
									href={vendor.legitimateInterestUrl}
									target="_blank"
									rel="noopener noreferrer"
									className={styles.vendorLink}
								>
									<svg
										className={styles.vendorLinkIcon}
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
										<polyline points="15 3 21 3 21 9" />
										<line x1="10" y1="14" x2="21" y2="3" />
									</svg>
									{iab.preferenceCenter.purposeItem.legitimateInterest}
								</a>
							)}
							{vendor.deviceStorageDisclosureUrl && (
								<a
									href={vendor.deviceStorageDisclosureUrl}
									target="_blank"
									rel="noopener noreferrer"
									className={styles.vendorLink}
								>
									<svg
										className={styles.vendorLinkIcon}
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
										<polyline points="15 3 21 3 21 9" />
										<line x1="10" y1="14" x2="21" y2="3" />
									</svg>
									{iab.preferenceCenter.vendorList.storageDisclosure}
								</a>
							)}
						</div>

						<div className={styles.vendorBadges}>
							{vendor.usesCookies && (
								<span className={styles.vendorBadge}>
									{iab.preferenceCenter.vendorList.usesCookies}
								</span>
							)}
							{vendor.usesNonCookieAccess && (
								<span className={styles.vendorBadge}>
									{iab.preferenceCenter.vendorList.nonCookieAccess}
								</span>
							)}
							{maxAgeText && (
								<span className={styles.vendorBadge}>{maxAgeText}</span>
							)}
							{standardRetentionDays && (
								<span className={styles.vendorBadge}>
									{iab.preferenceCenter.vendorList.retention.replace(
										'{days}',
										String(standardRetentionDays)
									)}
								</span>
							)}
						</div>

						{vendorPurposes.length > 0 && (
							<div className={styles.vendorPurposesList}>
								<h4 className={styles.vendorPurposesTitle}>
									{iab.preferenceCenter.vendorList.purposes} (
									{vendorPurposes.length})
								</h4>
								<ul className={styles.vendorPurposesItems}>
									{vendorPurposes.map((purpose) => {
										let retentionDays: number | undefined;
										if (vendor.dataRetention?.purposes?.[purpose.id]) {
											retentionDays = vendor.dataRetention.purposes[purpose.id];
										} else if (vendor.dataRetention?.stdRetention) {
											retentionDays = vendor.dataRetention.stdRetention;
										}
										return (
											<li
												key={purpose.id}
												className={`${styles.vendorPurposeItem} ${
													purpose.usesLegitimateInterest
														? styles.vendorPurposeItemLI
														: ''
												}`}
											>
												<span>
													{purpose.name}
													{retentionDays && (
														<span className={styles.vendorRetention}>
															{' '}
															(Retained: {retentionDays}d)
														</span>
													)}
												</span>
												{purpose.usesLegitimateInterest && (
													<span className={styles.vendorListLIBadge}>
														<svg
															style={{ width: '0.625rem', height: '0.625rem' }}
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															strokeWidth="2"
														>
															<path d="M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
														</svg>
														{iab.preferenceCenter.vendorList.legitimateInterest}
													</span>
												)}
											</li>
										);
									})}
								</ul>
							</div>
						)}

						{/* Legitimate Interest Objection */}
						{hasLegitimateInterest && onVendorLegitimateInterestToggle && (
							<div className={styles.vendorLISection}>
								<div className={styles.vendorLISectionHeader}>
									<h4 className={styles.vendorPurposesTitle}>
										<svg
											style={{
												width: '0.75rem',
												height: '0.75rem',
												marginRight: '0.25rem',
											}}
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
										>
											<path d="M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
										</svg>
										{iab.preferenceCenter.purposeItem.legitimateInterest}
									</h4>
									<button
										type="button"
										onClick={() =>
											onVendorLegitimateInterestToggle(
												vendor.id,
												!isLegitimateInterestAllowed
											)
										}
										className={`${styles.objectButton} ${!isLegitimateInterestAllowed ? styles.objectButtonActive : ''}`}
										aria-pressed={!isLegitimateInterestAllowed}
									>
										{isLegitimateInterestAllowed
											? iab.preferenceCenter.purposeItem.objectButton
											: iab.preferenceCenter.purposeItem.objected}
									</button>
								</div>
								<p className={styles.liExplanation}>
									{iab.preferenceCenter.purposeItem.rightToObject}
								</p>
							</div>
						)}

						{vendor.dataDeclaration && vendor.dataDeclaration.length > 0 && (
							<div className={styles.vendorPurposesList}>
								<h4 className={styles.vendorPurposesTitle}>
									{iab.preferenceCenter.vendorList.dataCategories} (
									{vendor.dataDeclaration.length})
								</h4>
								<ul className={styles.vendorPurposesItems}>
									{vendor.dataDeclaration.map((categoryId) => {
										const category = vendorData?.dataCategories?.[categoryId];
										return (
											<li
												key={categoryId}
												className={styles.vendorPurposeItem}
												title={category?.description}
											>
												{category?.name || `Data Category ${categoryId}`}
											</li>
										);
									})}
								</ul>
							</div>
						)}

						{vendorSpecialPurposes.length > 0 && (
							<div className={styles.vendorPurposesList}>
								<h4 className={styles.vendorPurposesTitle}>
									<svg
										aria-label={iab.preferenceCenter.vendorList.specialPurposes}
										role="img"
										style={{
											width: '0.75rem',
											height: '0.75rem',
											marginRight: '0.25rem',
										}}
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<title>
											{iab.preferenceCenter.vendorList.specialPurposes}
										</title>
										<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
										<path d="M7 11V7a5 5 0 0 1 10 0v4" />
									</svg>
									{iab.preferenceCenter.vendorList.specialPurposes} (
									{vendorSpecialPurposes.length})
								</h4>
								<ul className={styles.vendorPurposesItems}>
									{vendorSpecialPurposes.map((sp) => {
										let retentionDays: number | undefined;
										if (vendor.dataRetention?.specialPurposes?.[sp.id]) {
											retentionDays =
												vendor.dataRetention.specialPurposes[sp.id];
										} else if (vendor.dataRetention?.stdRetention) {
											retentionDays = vendor.dataRetention.stdRetention;
										}
										return (
											<li key={sp.id} className={styles.vendorPurposeItem}>
												<span>
													{sp.name}
													{retentionDays && (
														<span className={styles.vendorRetention}>
															{' '}
															(Retained: {retentionDays}d)
														</span>
													)}
												</span>
											</li>
										);
									})}
								</ul>
								<p
									className={styles.vendorListMetaText}
									style={{ fontStyle: 'italic', marginTop: '0.25rem' }}
								>
									{iab.preferenceCenter.vendorList.requiredNotice}
								</p>
							</div>
						)}

						{vendorSpecialFeatures.length > 0 && (
							<div className={styles.vendorPurposesList}>
								<h4 className={styles.vendorPurposesTitle}>
									{iab.preferenceCenter.vendorList.specialFeatures} (
									{vendorSpecialFeatures.length})
								</h4>
								<ul className={styles.vendorPurposesItems}>
									{vendorSpecialFeatures.map((sf) => (
										<li key={sf.id} className={styles.vendorPurposeItem}>
											{sf.name}
										</li>
									))}
								</ul>
							</div>
						)}

						{vendorFeatures.length > 0 && (
							<div className={styles.vendorPurposesList}>
								<h4 className={styles.vendorPurposesTitle}>
									{iab.preferenceCenter.vendorList.features} (
									{vendorFeatures.length})
								</h4>
								<ul className={styles.vendorPurposesItems}>
									{vendorFeatures.map((f) => (
										<li key={f.id} className={styles.vendorPurposeItem}>
											{f.name}
										</li>
									))}
								</ul>
							</div>
						)}
					</Collapsible.Content>
				</Collapsible.Root>
			</div>
		);
	}
};
