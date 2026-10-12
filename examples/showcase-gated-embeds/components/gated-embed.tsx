'use client';

import { ConsentGate, useSaveConsents, useTranslations } from 'c15t/next';
import type { AllConsentNames } from 'c15t/next';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface GatedEmbedProps {
	/** The one consent category this embed needs. */
	category: AllConsentNames;
	/** Names the embed above the disclosure, such as "Map from Google Maps". */
	label: string;
	/** What loading the embed sends, and to whom. One sentence. */
	disclosure: string;
	/** A drawn preview. Never a vendor thumbnail: that would be a request. */
	preview: ReactNode;
	/** Text for the button that grants the category. */
	allowLabel?: string;
	className?: string;
	/** The embed. ConsentGate mounts it only while the category is allowed. */
	children: ReactNode;
}

interface EmbedPlaceholderProps {
	allowLabel: string;
	category: AllConsentNames;
	disclosure: string;
	label: string;
	onAllowed: () => void;
	preview: ReactNode;
}

const EmbedPlaceholder = ({
	allowLabel,
	category,
	disclosure,
	label,
	onAllowed,
	preview,
}: EmbedPlaceholderProps) => {
	const save = useSaveConsents();
	const { consentTypes } = useTranslations();
	const [status, setStatus] = useState<'idle' | 'saving' | 'failed'>('idle');
	// The same name the preference dialog shows for this category.
	const categoryTitle = consentTypes[category]?.title ?? category;

	const allow = async () => {
		setStatus('saving');
		// Records a choice for this one category. Every other category keeps
		// whatever the visitor chose before, or stays undecided.
		const result = await save({ [category]: true });
		if (result.ok) {
			onAllowed();
		} else {
			setStatus('failed');
		}
	};

	return (
		<div className="embed-placeholder">
			<div
				className="embed-preview"
				aria-hidden="true"
			>
				{preview}
			</div>
			<div className="embed-consent">
				<p className="embed-label">{label}</p>
				<p className="embed-disclosure">{disclosure}</p>
				<button
					type="button"
					className="button button-primary"
					disabled={status === 'saving'}
					onClick={allow}
				>
					{status === 'saving' ? 'Loading…' : allowLabel}
				</button>
				<p
					className="embed-fine-print"
					aria-live="polite"
				>
					{status === 'failed'
						? "This can't be turned on under the privacy policy for your region."
						: `Turns on ${categoryTitle} only. You can turn it off in Privacy settings.`}
				</p>
			</div>
		</div>
	);
};

/**
 * A third-party embed that stays out of the page until its category is
 * allowed. The placeholder grants that one category in place, so the embed
 * loads where the visitor is looking, without a reload or a dialog.
 */
export const GatedEmbed = ({
	category,
	label,
	disclosure,
	preview,
	allowLabel = 'Allow and load',
	className,
	children,
}: GatedEmbedProps) => {
	const frameRef = useRef<HTMLDivElement>(null);

	return (
		<ConsentGate
			ref={frameRef}
			category={category}
			className={className}
			tabIndex={-1}
			placeholder={
				<EmbedPlaceholder
					allowLabel={allowLabel}
					category={category}
					disclosure={disclosure}
					label={label}
					// The button unmounts with the placeholder. Keep keyboard and
					// screen reader focus on the embed that replaced it.
					onAllowed={() => frameRef.current?.focus()}
					preview={preview}
				/>
			}
		>
			{children}
		</ConsentGate>
	);
};
