'use client';

import styles from '@c15t/ui/styles/components/iab-consent-dialog';
import { useState } from 'react';
import type { FC } from 'react';

import * as PreferenceItem from '~/components/shared/ui/preference-item';
import * as Switch from '~/components/shared/ui/switch';
import { useTheme } from '~/hooks/use-theme';
import { useUIConfig } from '~/ui-config-context';
import { mergeSlotProps } from '~/utils/merge-slot-props';

import type { ProcessedStack, VendorId } from '../types';
import { PurposeItem } from './purpose-item';

const EMPTY_VENDOR_INTERESTS: Record<string, boolean> = {};
const EMPTY_PURPOSE_INTERESTS: Record<number, boolean> = {};

interface StackItemProps {
	stack: ProcessedStack;
	consents: Record<number, boolean>;
	onToggle: (purposeId: number, value: boolean) => void;
	vendorConsents: Record<string, boolean>;
	onVendorToggle: (vendorId: VendorId, value: boolean) => void;
	onVendorClick: (vendorId: VendorId) => void;
	/** Legitimate interest objections - true means user has NOT objected (allowed) */
	vendorLegitimateInterests?: Record<string, boolean>;
	/** Handler for legitimate interest objection toggle */
	onVendorLegitimateInterestToggle?: (
		vendorId: VendorId,
		value: boolean
	) => void;
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
	vendorLegitimateInterests = EMPTY_VENDOR_INTERESTS,
	onVendorLegitimateInterestToggle,
	purposeLegitimateInterests = EMPTY_PURPOSE_INTERESTS,
	onPurposeLegitimateInterestToggle,
}) => {
	const { components } = useUIConfig();
	const { noStyle } = useTheme();
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
	const headerProps = mergeSlotProps(components?.['iab-stack-item']?.header, {
		baseClassName: styles.stackHeader,
		noStyle,
	});

	const totalVendors = new Set(
		stack.purposes.flatMap((p) => p.vendors.map((v) => v.id))
	).size;

	return (
		<PreferenceItem.Root
			className={noStyle ? undefined : styles.stackItem}
			data-testid={`stack-item-${stack.id}`}
			noStyle
			onOpenChange={setIsExpanded}
			open={isExpanded}
			slotKey="iab-stack-item.root"
		>
			<div {...headerProps}>
				<PreferenceItem.Trigger
					className={noStyle ? undefined : styles.stackTrigger}
					noStyle
					slotKey="iab-stack-item.trigger"
				>
					<PreferenceItem.Leading noStyle>
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
					</PreferenceItem.Leading>
					<PreferenceItem.Header
						className={styles.stackInfo}
						noStyle
					>
						<PreferenceItem.Title
							className={styles.stackName}
							noStyle
						>
							{stack.name}
						</PreferenceItem.Title>
						<PreferenceItem.Meta
							className={styles.stackMeta}
							noStyle
						>
							{totalVendors} {totalVendors === 1 ? 'partner' : 'partners'}
						</PreferenceItem.Meta>
					</PreferenceItem.Header>
				</PreferenceItem.Trigger>
				<PreferenceItem.Control
					className={styles.stackControls}
					noStyle
				>
					{someEnabled && (
						<div
							className={styles.partialIndicator}
							title="Partially enabled"
						/>
					)}
					<Switch.Root
						aria-label={stack.name}
						checked={allEnabled}
						onCheckedChange={handleStackToggle}
					/>
				</PreferenceItem.Control>
			</div>
			<PreferenceItem.Content noStyle={noStyle}>
				<div className={styles.stackDescription}>
					<p>{stack.description}</p>
				</div>
				<div
					{...mergeSlotProps(components?.['iab-stack-item']?.content, {
						baseClassName: styles.stackContent,
						noStyle,
					})}
				>
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
			</PreferenceItem.Content>
		</PreferenceItem.Root>
	);
};
