'use client';

import styles from '@c15t/ui/styles/components/iab-preference-center.module.css';
import { type FC, useState } from 'react';
import * as Switch from '~/components/shared/ui/switch';
import type { ProcessedStack } from '../types';
import { PurposeItem } from './purpose-item';

interface StackItemProps {
	stack: ProcessedStack;
	consents: Record<number, boolean>;
	onToggle: (purposeId: number, value: boolean) => void;
	vendorConsents: Record<number, boolean>;
	onVendorToggle: (vendorId: number, value: boolean) => void;
	onVendorClick: (vendorId: number) => void;
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

export const StackItem: FC<StackItemProps> = ({
	stack,
	consents,
	onToggle,
	vendorConsents,
	onVendorToggle,
	onVendorClick,
	vendorLegitimateInterests = {},
	onVendorLegitimateInterestToggle,
	purposeLegitimateInterests = {},
	onPurposeLegitimateInterestToggle,
}) => {
	const [isExpanded, setIsExpanded] = useState(false);

	const allEnabled = stack.purposes.every((p) => consents[p.id] ?? false);
	const someEnabled =
		stack.purposes.some((p) => consents[p.id] ?? false) && !allEnabled;

	const handleStackToggle = (value: boolean) => {
		// Toggle all purposes in the stack
		for (const purpose of stack.purposes) {
			onToggle(purpose.id, value);
			// Also toggle all vendors associated with this purpose
			for (const vendor of purpose.vendors) {
				// Only toggle consent-based vendors (not legitimate interest ones)
				if (!vendor.usesLegitimateInterest) {
					onVendorToggle(vendor.id, value);
				}
			}
		}
	};

	const totalVendors = new Set(
		stack.purposes.flatMap((p) => p.vendors.map((v) => v.id))
	).size;

	return (
		<div className={styles.stackItem} data-testid={`stack-item-${stack.id}`}>
			<div className={styles.stackHeader}>
				<button
					type="button"
					onClick={() => setIsExpanded(!isExpanded)}
					className={styles.stackTrigger}
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
					<div className={styles.stackInfo}>
						<h3 className={styles.stackName}>{stack.name}</h3>
						{!isExpanded && (
							<p className={styles.stackMeta}>
								{totalVendors} {totalVendors === 1 ? 'partner' : 'partners'}
							</p>
						)}
					</div>
				</button>
				<div className={styles.stackControls}>
					{someEnabled && (
						<div
							className={styles.partialIndicator}
							title="Partially enabled"
						/>
					)}
					<Switch.Root
						checked={allEnabled}
						onCheckedChange={handleStackToggle}
					/>
				</div>
			</div>
			{isExpanded && (
				<>
					<div className={styles.stackDescription}>
						<p>{stack.description}</p>
						<p className={styles.stackMeta}>
							{totalVendors} {totalVendors === 1 ? 'partner' : 'partners'}
						</p>
					</div>
					<div className={styles.stackContent}>
						{stack.purposes.map((purpose) => (
							<PurposeItem
								key={purpose.id}
								purpose={purpose}
								isEnabled={consents[purpose.id] ?? false}
								onToggle={(value) => onToggle(purpose.id, value)}
								vendorConsents={vendorConsents}
								onVendorToggle={onVendorToggle}
								onVendorClick={onVendorClick}
								vendorLegitimateInterests={vendorLegitimateInterests}
								onVendorLegitimateInterestToggle={
									onVendorLegitimateInterestToggle
								}
								purposeLegitimateInterests={purposeLegitimateInterests}
								onPurposeLegitimateInterestToggle={
									onPurposeLegitimateInterestToggle
								}
							/>
						))}
					</div>
				</>
			)}
		</div>
	);
};
