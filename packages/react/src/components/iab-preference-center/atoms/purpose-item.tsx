'use client';

import styles from '@c15t/ui/styles/components/iab-preference-center.module.css';
import { type FC, useState } from 'react';
import * as Switch from '~/components/shared/ui/switch';
import type { ProcessedPurpose, ProcessedVendor } from '../types';
import { useIABTranslations } from '../use-iab-translations';

interface PurposeItemProps {
	purpose: ProcessedPurpose;
	isEnabled: boolean;
	onToggle: (value: boolean) => void;
	vendorConsents: Record<number, boolean>;
	onVendorToggle: (vendorId: number, value: boolean) => void;
	onVendorClick: (vendorId: number) => void;
	isLocked?: boolean;
	/** Legitimate interest objections - true means user has NOT objected (allowed) */
	vendorLegitimateInterests?: Record<number, boolean>;
	/** Handler for legitimate interest objection toggle */
	onVendorLegitimateInterestToggle?: (vendorId: number, value: boolean) => void;
	/** Purpose-level legitimate interest state - true means NOT objected (allowed) */
	purposeLegitimateInterests?: Record<number, boolean>;
	/** Handler for purpose-level legitimate interest objection toggle */
	onPurposeLegitimateInterestToggle?: (
		purposeId: number,
		value: boolean
	) => void;
}

export const PurposeItem: FC<PurposeItemProps> = ({
	purpose,
	isEnabled,
	onToggle,
	vendorConsents,
	onVendorToggle,
	onVendorClick,
	isLocked = false,
	vendorLegitimateInterests = {},
	onVendorLegitimateInterestToggle,
	purposeLegitimateInterests = {},
	onPurposeLegitimateInterestToggle,
}) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const [showExamples, setShowExamples] = useState(false);
	const [showVendors, setShowVendors] = useState(false);
	const iab = useIABTranslations();

	const legIntVendors = purpose.vendors.filter((v) => v.usesLegitimateInterest);
	const consentVendors = purpose.vendors.filter(
		(v) => !v.usesLegitimateInterest
	);

	// Check if purpose-level LI is allowed (not objected)
	const isPurposeLIAllowed = purposeLegitimateInterests[purpose.id] ?? true;

	// Handler for purpose-level LI objection - also objects to all LI vendors for this purpose
	const handlePurposeLIObjection = () => {
		const newValue = !isPurposeLIAllowed;
		if (onPurposeLegitimateInterestToggle) {
			onPurposeLegitimateInterestToggle(purpose.id, newValue);
		}
		// Also toggle all LI vendors for this purpose
		if (onVendorLegitimateInterestToggle) {
			for (const vendor of legIntVendors) {
				onVendorLegitimateInterestToggle(vendor.id, newValue);
			}
		}
	};

	// Separate IAB and custom vendors
	const iabConsentVendors = consentVendors.filter((v) => !v.isCustom);
	const customConsentVendors = consentVendors.filter((v) => v.isCustom);
	const iabLegIntVendors = legIntVendors.filter((v) => !v.isCustom);
	const customLegIntVendors = legIntVendors.filter((v) => v.isCustom);

	// Handle purpose toggle - also toggles all consent-based vendors
	const handlePurposeToggle = (value: boolean) => {
		onToggle(value);
		// Also toggle all consent-based vendors associated with this purpose
		for (const vendor of consentVendors) {
			onVendorToggle(vendor.id, value);
		}
	};

	return (
		<div
			className={styles.purposeItem}
			data-testid={`purpose-item-${purpose.id}`}
		>
			<div className={styles.purposeHeader}>
				<button
					type="button"
					onClick={() => setIsExpanded(!isExpanded)}
					className={styles.purposeTrigger}
				>
					<svg
						className={styles.purposeArrow}
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						{isExpanded ? (
							<path d="M19 9l-7 7-7-7" />
						) : (
							<path d="M9 5l7 7-7 7" />
						)}
					</svg>
					<div className={styles.purposeInfo}>
						<h3 className={styles.purposeName}>
							{purpose.name}
							{isLocked && (
								<svg
									className={styles.lockIcon}
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
									<path d="M7 11V7a5 5 0 0 1 10 0v4" />
								</svg>
							)}
						</h3>
						<p className={styles.purposeMeta}>
							{iab.preferenceCenter.purposeItem.partners.replace(
								'{count}',
								String(purpose.vendors.length)
							)}
						</p>
						{legIntVendors.length > 0 && (
							<div className={styles.legitimateInterestBadge}>
								<svg
									className={styles.legitimateInterestIcon}
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<path d="M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
								</svg>
								{iab.preferenceCenter.purposeItem.vendorsUseLegitimateInterest.replace(
									'{count}',
									String(legIntVendors.length)
								)}
							</div>
						)}
					</div>
				</button>
				<Switch.Root
					checked={isEnabled}
					onCheckedChange={handlePurposeToggle}
					disabled={isLocked}
				/>
			</div>

			{isExpanded && (
				<div className={styles.purposeContent}>
					<p className={styles.purposeDescription}>{purpose.description}</p>

					{/* Purpose-level Legitimate Interest Objection */}
					{legIntVendors.length > 0 && onPurposeLegitimateInterestToggle && (
						<div className={styles.purposeLISection}>
							<div className={styles.purposeLISectionHeader}>
								<div className={styles.purposeLIInfo}>
									<svg
										className={styles.legitimateInterestIcon}
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
									</svg>
									<span>
										{iab.preferenceCenter.purposeItem.vendorsUseLegitimateInterest.replace(
											'{count}',
											String(legIntVendors.length)
										)}
									</span>
								</div>
								<button
									type="button"
									onClick={handlePurposeLIObjection}
									className={`${styles.objectButton} ${!isPurposeLIAllowed ? styles.objectButtonActive : ''}`}
									aria-pressed={!isPurposeLIAllowed}
								>
									{isPurposeLIAllowed
										? iab.preferenceCenter.purposeItem.objectButton
										: iab.preferenceCenter.purposeItem.objected}
								</button>
							</div>
							<p className={styles.liExplanation}>
								{iab.preferenceCenter.purposeItem.rightToObject}
							</p>
						</div>
					)}

					{/* Legacy badge for when there's no toggle handler */}
					{legIntVendors.length > 0 && !onPurposeLegitimateInterestToggle && (
						<div className={styles.legitimateInterestBadge}>
							<svg
								className={styles.legitimateInterestIcon}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
							</svg>
							{iab.preferenceCenter.purposeItem.vendorsUseLegitimateInterest.replace(
								'{count}',
								String(legIntVendors.length)
							)}
						</div>
					)}

					{purpose.illustrations && purpose.illustrations.length > 0 && (
						<div>
							<button
								type="button"
								onClick={() => setShowExamples(!showExamples)}
								className={styles.examplesToggle}
							>
								<svg
									style={{ width: '0.75rem', height: '0.75rem' }}
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									{showExamples ? (
										<path d="M19 9l-7 7-7-7" />
									) : (
										<path d="M9 5l7 7-7 7" />
									)}
								</svg>
								{iab.preferenceCenter.purposeItem.examples} (
								{purpose.illustrations.length})
							</button>
							{showExamples && (
								<ul className={styles.examplesList}>
									{purpose.illustrations.map((illustration, index) => (
										<li key={index}>{illustration}</li>
									))}
								</ul>
							)}
						</div>
					)}

					<div>
						<button
							type="button"
							onClick={() => setShowVendors(!showVendors)}
							className={styles.vendorsToggle}
						>
							<svg
								style={{ width: '0.75rem', height: '0.75rem' }}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								{showVendors ? (
									<path d="M19 9l-7 7-7-7" />
								) : (
									<path d="M9 5l7 7-7 7" />
								)}
							</svg>
							{iab.preferenceCenter.purposeItem.partnersUsingPurpose} (
							{purpose.vendors.length})
						</button>
						{showVendors && (
							<div className={styles.vendorSection}>
								{/* IAB Consent Vendors */}
								{iabConsentVendors.length > 0 && (
									<>
										<h5 className={styles.vendorSectionTitle}>
											{iab.preferenceCenter.purposeItem.withYourPermission} (
											{iabConsentVendors.length})
										</h5>
										{iabConsentVendors.map((vendor) => (
											<VendorRow
												key={vendor.id}
												vendor={vendor}
												isConsented={vendorConsents[vendor.id] ?? false}
												onToggle={(value) => onVendorToggle(vendor.id, value)}
												onClick={() => onVendorClick(vendor.id)}
											/>
										))}
									</>
								)}
								{/* IAB Legitimate Interest Vendors */}
								{iabLegIntVendors.length > 0 && (
									<>
										<h5
											className={`${styles.vendorSectionTitle} ${styles.vendorSectionTitleLI}`}
										>
											<svg
												style={{ width: '0.75rem', height: '0.75rem' }}
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
											>
												<path d="M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
											</svg>
											{iab.preferenceCenter.purposeItem.legitimateInterest} (
											{iabLegIntVendors.length})
										</h5>
										<p className={styles.liExplanation}>
											{iab.preferenceCenter.purposeItem.rightToObject}
										</p>
										{iabLegIntVendors.map((vendor) => (
											<VendorRow
												key={vendor.id}
												vendor={vendor}
												isConsented={vendorConsents[vendor.id] ?? false}
												onToggle={(value) => onVendorToggle(vendor.id, value)}
												onClick={() => onVendorClick(vendor.id)}
												isLegitimateInterest
												isLegitimateInterestAllowed={
													vendorLegitimateInterests[vendor.id] ?? true
												}
												onLegitimateInterestToggle={
													onVendorLegitimateInterestToggle
														? (value) =>
																onVendorLegitimateInterestToggle(
																	vendor.id,
																	value
																)
														: undefined
												}
											/>
										))}
									</>
								)}
								{/* Custom Vendors */}
								{(customConsentVendors.length > 0 ||
									customLegIntVendors.length > 0) && (
									<div className={styles.customVendorPurposeSection}>
										<h5 className={styles.vendorSectionTitleCustom}>
											<svg
												style={{ width: '0.75rem', height: '0.75rem' }}
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
											{customConsentVendors.length + customLegIntVendors.length}
											)
										</h5>
										{customConsentVendors.map((vendor) => (
											<VendorRow
												key={vendor.id}
												vendor={vendor}
												isConsented={vendorConsents[vendor.id] ?? false}
												onToggle={(value) => onVendorToggle(vendor.id, value)}
												onClick={() => onVendorClick(vendor.id)}
											/>
										))}
										{customLegIntVendors.map((vendor) => (
											<VendorRow
												key={vendor.id}
												vendor={vendor}
												isConsented={vendorConsents[vendor.id] ?? false}
												onToggle={(value) => onVendorToggle(vendor.id, value)}
												onClick={() => onVendorClick(vendor.id)}
												isLegitimateInterest
												isLegitimateInterestAllowed={
													vendorLegitimateInterests[vendor.id] ?? true
												}
												onLegitimateInterestToggle={
													onVendorLegitimateInterestToggle
														? (value) =>
																onVendorLegitimateInterestToggle(
																	vendor.id,
																	value
																)
														: undefined
												}
											/>
										))}
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

interface VendorRowProps {
	vendor: ProcessedVendor;
	isConsented: boolean;
	onToggle: (value: boolean) => void;
	onClick: () => void;
	isLegitimateInterest?: boolean;
	/** For LI vendors: true means user has NOT objected (processing allowed) */
	isLegitimateInterestAllowed?: boolean;
	/** Handler for LI objection - value true = allow, false = object */
	onLegitimateInterestToggle?: (value: boolean) => void;
}

const VendorRow: FC<VendorRowProps> = ({
	vendor,
	isConsented,
	onToggle,
	onClick,
	isLegitimateInterest = false,
	isLegitimateInterestAllowed = true,
	onLegitimateInterestToggle,
}) => {
	const iab = useIABTranslations();

	// For LI vendors, we show an objection control instead of consent toggle
	const showLIControl = isLegitimateInterest && onLegitimateInterestToggle;

	return (
		<div
			className={`${styles.vendorRow} ${isLegitimateInterest ? styles.vendorRowLI : ''}`}
		>
			<div className={styles.vendorInfo}>
				<button type="button" onClick={onClick} className={styles.vendorName}>
					<span>{vendor.name}</span>
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
				</button>
				<div className={styles.vendorDetails}>
					{isLegitimateInterest && (
						<span className={`${styles.vendorDetail} ${styles.vendorDetailLI}`}>
							{iab.preferenceCenter.purposeItem.legitimateInterest}
						</span>
					)}
					{vendor.usesCookies && (
						<span className={styles.vendorDetail}>
							{iab.preferenceCenter.vendorList.usesCookies}
						</span>
					)}
					{vendor.usesNonCookieAccess && (
						<span className={styles.vendorDetail}>
							{iab.preferenceCenter.vendorList.nonCookieAccess}
						</span>
					)}
				</div>
			</div>
			{showLIControl ? (
				<button
					type="button"
					onClick={() =>
						onLegitimateInterestToggle(!isLegitimateInterestAllowed)
					}
					className={`${styles.objectButton} ${!isLegitimateInterestAllowed ? styles.objectButtonActive : ''}`}
					aria-pressed={!isLegitimateInterestAllowed}
				>
					{isLegitimateInterestAllowed
						? iab.preferenceCenter.purposeItem.objectButton
						: iab.preferenceCenter.purposeItem.objected}
				</button>
			) : (
				<div style={{ transform: 'scale(0.75)' }}>
					<Switch.Root checked={isConsented} onCheckedChange={onToggle} />
				</div>
			)}
		</div>
	);
};
