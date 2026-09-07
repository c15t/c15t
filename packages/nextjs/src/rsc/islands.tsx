'use client';

import type { PolicyRule, PromptPosition, PromptVariant } from '@c15t/core';
import { ConsentBanner } from '@c15t/react';
import { useHeadlessConsentUI } from '@c15t/react/headless';
import type { PolicyRight } from '@c15t/schema/types';
import type { ReactNode } from 'react';

/**
 * Shared prompt visibility and accessibility, including notice and expiry.
 *
 * The root resolves the prompt shape itself from the provider presentation
 * and emits `data-variant`, `data-position` and `data-blocking`. The server
 * shell hands over what it resolved as props so both sides agree even when
 * the boundary carries no presentation; a defaulted position is left to the
 * root so it can mirror the corner for right-to-left text.
 */
export const RscBannerGate = ({
	children,
	title,
	className,
	prompt,
	model,
	variant,
	position,
	blocking,
}: {
	children: ReactNode;
	title: string;
	className?: string;
	/** Server-resolved prompt kind, mirrored as `data-prompt` on first paint. */
	prompt?: PolicyRule['prompt'];
	/** Server-resolved model, mirrored as `data-model` on first paint. */
	model?: PolicyRule['model'];
	/** Server-resolved prompt variant. */
	variant?: PromptVariant;
	/** Host-chosen position only; defaulted positions stay with the root. */
	position?: PromptPosition;
	/** Server-resolved blocking state; the root adds overlay, lock and trap. */
	blocking?: boolean;
}) => (
	<ConsentBanner.Root
		aria-label={title}
		className={className}
		disableAnimation
		trapFocus={false}
		variant={variant}
		position={position}
		blocking={blocking}
		data-prompt={prompt === 'none' ? undefined : prompt}
		data-model={model}
	>
		{children}
	</ConsentBanner.Root>
);

export interface RscBannerActionsProps {
	acceptLabel: string;
	rejectLabel: string;
	customizeLabel: string;
	dismissLabel?: string;
	/** Labels for right buttons; unknown rights fall back to their key. */
	rightLabels?: Partial<Record<PolicyRight, string>>;
	classNames?: {
		footer?: string;
		acceptButton?: string;
		rejectButton?: string;
		customizeButton?: string;
		dismissButton?: string;
		rights?: string;
		rightLink?: string;
	};
}

/** Use the React action renderer so required controls keep equal prominence. */
export const RscBannerActions = ({
	acceptLabel,
	rejectLabel,
	customizeLabel,
	dismissLabel = 'Accept All',
	rightLabels,
	classNames,
}: RscBannerActionsProps) => {
	const { banner, openDialog, performBannerAction } = useHeadlessConsentUI();
	const labels = {
		accept: acceptLabel,
		customize: customizeLabel,
		dismiss: dismissLabel,
		reject: rejectLabel,
		save: 'Save',
	};
	const classes = {
		accept: classNames?.acceptButton,
		customize: classNames?.customizeButton,
		dismiss: classNames?.dismissButton,
		reject: classNames?.rejectButton,
		save: undefined,
	};
	const rights = banner.uncoveredRights;
	return (
		<div className={classNames?.footer}>
			{rights.length > 0 ? (
				<div
					className={classNames?.rights}
					data-testid="consent-banner-rights"
				>
					{rights.map((right) => (
						<button
							key={right}
							type="button"
							className={classNames?.rightLink}
							data-action="right"
							data-right={right}
							data-variant="neutral"
							data-testid={`consent-banner-right-link-${right}`}
							onClick={openDialog}
						>
							{rightLabels?.[right] ?? right}
						</button>
					))}
				</div>
			) : null}
			<ConsentBanner.PolicyActions
				renderAction={(action, { key, isPrimary, style }) => (
					<button
						key={key}
						type="button"
						className={classes[action]}
						style={style}
						data-action={action}
						data-primary={isPrimary || undefined}
						data-testid={`consent-banner-${action}-button`}
						onClick={() => {
							void performBannerAction(action);
						}}
					>
						{labels[action]}
					</button>
				)}
			/>
		</div>
	);
};
