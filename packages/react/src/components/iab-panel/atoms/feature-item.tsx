'use client';

import { iabDisplayTestId } from '@c15t/iab/headless';
import styles from '@c15t/ui/styles/components/iab-consent-dialog';
import { useState } from 'react';
import type { FC } from 'react';

import * as PreferenceItem from '~/components/shared/ui/preference-item';
import { useTheme } from '~/hooks/use-theme';
import { useUIConfig } from '~/ui-config-context';
import { mergeSlotProps } from '~/utils/merge-slot-props';

import type { ProcessedFeature } from '../types';
import { useIABTranslations } from '../use-iab-translations';

/** Props for {@link FeatureItem}. */
export interface FeatureItemProps {
	/** The feature, as a display-model row or processed GVL feature. */
	feature: ProcessedFeature;
	/**
	 * The row's `data-testid`. Comes from the shared display model, which
	 * namespaces it by row kind.
	 */
	testId?: string;
}

/**
 * One informational IAB Feature row.
 *
 * TCF Policies v5.0.b forbid showing Features next to a control that
 * cannot be disabled, so this row has no switch, no lock and no per-vendor
 * toggles. It shows the name, the description, the illustrations and the
 * names of the vendors that use the feature.
 *
 * @param props - The feature and its test id.
 * @returns The collapsible feature row.
 * @example
 * ```tsx
 * <FeatureItem feature={row} testId={row.testId} />
 * ```
 */
export const FeatureItem: FC<FeatureItemProps> = ({ feature, testId }) => {
	const { components } = useUIConfig();
	const { noStyle } = useTheme();
	const [isExpanded, setIsExpanded] = useState(false);
	const [showExamples, setShowExamples] = useState(false);
	const [showVendors, setShowVendors] = useState(false);
	const iab = useIABTranslations();
	const headerProps = mergeSlotProps(components?.['iab-purpose-item']?.header, {
		baseClassName: styles.purposeHeader,
		noStyle,
	});
	const examplesProps = mergeSlotProps(
		components?.['iab-purpose-item']?.examples,
		{ noStyle }
	);
	const vendorsProps = mergeSlotProps(
		components?.['iab-purpose-item']?.vendors,
		{ noStyle }
	);

	return (
		<PreferenceItem.Root
			className={noStyle ? undefined : styles.purposeItem}
			data-testid={testId ?? iabDisplayTestId('feature', feature.id)}
			noStyle
			onOpenChange={setIsExpanded}
			open={isExpanded}
			slotKey="iab-purpose-item.root"
		>
			<div {...headerProps}>
				<PreferenceItem.Trigger
					className={noStyle ? undefined : styles.purposeTrigger}
					noStyle
					slotKey="iab-purpose-item.trigger"
				>
					<PreferenceItem.Leading noStyle>
						<svg
							aria-hidden="true"
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
						className={styles.purposeInfo}
						noStyle
					>
						<PreferenceItem.Title
							className={styles.purposeName}
							noStyle
						>
							{feature.name}
						</PreferenceItem.Title>
						<PreferenceItem.Meta
							className={styles.purposeMeta}
							noStyle
						>
							{iab.preferenceCenter.purposeItem.partners.replace(
								'{count}',
								String(feature.vendors.length)
							)}
						</PreferenceItem.Meta>
					</PreferenceItem.Header>
				</PreferenceItem.Trigger>
			</div>

			<PreferenceItem.Content
				innerClassName={noStyle ? undefined : styles.purposeContent}
				innerSlotKey="iab-purpose-item.content"
				noStyle={noStyle}
			>
				<p className={styles.purposeDescription}>{feature.description}</p>

				{feature.illustrations.length > 0 && (
					<div {...examplesProps}>
						<PreferenceItem.Root
							noStyle
							onOpenChange={setShowExamples}
							open={showExamples}
						>
							<PreferenceItem.Trigger
								className={styles.examplesToggle}
								noStyle
							>
								<svg
									aria-hidden="true"
									style={{ height: '0.75rem', width: '0.75rem' }}
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
								{feature.illustrations.length})
							</PreferenceItem.Trigger>
							<PreferenceItem.Content noStyle={noStyle}>
								<ul className={styles.examplesList}>
									{feature.illustrations.map((illustration, index) => (
										<li key={index}>{illustration}</li>
									))}
								</ul>
							</PreferenceItem.Content>
						</PreferenceItem.Root>
					</div>
				)}

				{feature.vendors.length > 0 && (
					<div {...vendorsProps}>
						<PreferenceItem.Root
							noStyle
							onOpenChange={setShowVendors}
							open={showVendors}
						>
							<PreferenceItem.Trigger
								className={styles.vendorsToggle}
								noStyle
							>
								<svg
									aria-hidden="true"
									style={{ height: '0.75rem', width: '0.75rem' }}
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
								{iab.preferenceCenter.vendorList.iabVendorsHeading} (
								{feature.vendors.length})
							</PreferenceItem.Trigger>
							<PreferenceItem.Content noStyle={noStyle}>
								<ul className={styles.examplesList}>
									{feature.vendors.map((vendor) => (
										<li key={vendor.id}>{vendor.name}</li>
									))}
								</ul>
							</PreferenceItem.Content>
						</PreferenceItem.Root>
					</div>
				)}
			</PreferenceItem.Content>
		</PreferenceItem.Root>
	);
};
