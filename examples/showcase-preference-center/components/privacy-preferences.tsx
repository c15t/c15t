'use client';

import { vendorsListedUnder } from 'c15t';
import type { AllConsentNames, CategoryDecision, ResolvedVendor } from 'c15t';
import {
	ConsentWidget,
	useConsentDraft,
	useConsents,
	useDeclaredVendors,
	useExplicitChoice,
	useHasConsentUI,
	useModel,
	useTranslations,
} from 'c15t/next';

const formatTime = (epochMs: number) =>
	new Intl.DateTimeFormat(undefined, {
		dateStyle: 'long',
		timeStyle: 'short',
	}).format(epochMs);

interface CategoryRowProps {
	category: AllConsentNames;
	title: string;
	description: string | undefined;
	vendors: readonly ResolvedVendor[];
	/** The switch position: what Save records. */
	staged: boolean;
	/** The permission scripts follow right now. */
	live: boolean;
	/** The recorded choice for this category, if the visitor made one. */
	decision: CategoryDecision | undefined;
	onChange: (value: boolean) => void;
}

const CategoryRow = ({
	category,
	title,
	description,
	vendors,
	staged,
	live,
	decision,
	onChange,
}: CategoryRowProps) => {
	const titleId = `category-${category}`;
	const required = category === 'necessary';
	const pending = !required && staged !== (decision?.value ?? live);

	return (
		<li className="category">
			<div className="category-header">
				<div>
					<h2
						id={titleId}
						className="category-title"
					>
						{title}
					</h2>
					{required ? null : (
						<p className="category-status">
							<span
								className="state"
								data-on={live}
							>
								{live ? 'On' : 'Off'}
							</span>
							{decision ? null : 'Not chosen yet'}
							{pending ? (
								<span className="pending">
									{staged ? 'Turns on' : 'Turns off'} when you save
								</span>
							) : null}
						</p>
					)}
				</div>
				{required ? (
					<span className="always-on">Always on</span>
				) : (
					<ConsentWidget.Switch
						noStyle={false}
						aria-labelledby={titleId}
						checked={staged}
						onCheckedChange={onChange}
					/>
				)}
			</div>

			{description ? (
				<p className="category-description">{description}</p>
			) : null}

			{vendors.length > 0 ? (
				<div className="vendors">
					<h3 className="vendors-title">Used by</h3>
					<ul className="vendor-list">
						{vendors.map((vendor) => (
							<li
								key={vendor.id}
								className="vendor"
							>
								<span className="vendor-name">{vendor.name ?? vendor.id}</span>
								{vendor.description ? (
									<span className="vendor-description">
										{vendor.description}
									</span>
								) : null}
								{vendor.privacyPolicyUrl ? (
									<a
										className="vendor-link"
										href={vendor.privacyPolicyUrl}
										rel="noreferrer"
										target="_blank"
									>
										Privacy policy
										<span className="visually-hidden">
											{` for ${vendor.name ?? vendor.id}, opens in a new tab`}
										</span>
									</a>
								) : null}
							</li>
						))}
					</ul>
				</div>
			) : null}
		</li>
	);
};

const PreferenceForm = () => {
	// The draft the switches stage into. Nothing is recorded until Save.
	const draft = useConsentDraft();
	// The recorded choice: one value and confirmation time per category.
	const choice = useExplicitChoice();
	// What scripts follow right now.
	const permissions = useConsents();
	const declaredVendors = useDeclaredVendors();
	const { consentTypes } = useTranslations();

	const decisions = Object.values(choice?.categories ?? {});
	const lastSaved = decisions.length
		? Math.max(...decisions.map((decision) => decision.confirmedAt))
		: null;

	return (
		<>
			<output className="saved-summary">
				{lastSaved
					? `Your choices were last saved on ${formatTime(lastSaved)}.`
					: 'You have not saved a choice in this browser yet.'}
			</output>

			{draft.isStale ? (
				<div
					className="notice"
					role="alert"
				>
					<p>Our privacy policy changed while you were editing.</p>
					<button
						type="button"
						className="button button-secondary"
						onClick={() => draft.reset()}
					>
						Review choices
					</button>
				</div>
			) : null}

			<ul className="category-list">
				{draft.displayedCategories.map((category) => (
					<CategoryRow
						key={category}
						category={category}
						title={consentTypes[category]?.title ?? category}
						description={consentTypes[category]?.description}
						vendors={vendorsListedUnder(declaredVendors, category)}
						staged={draft.values[category]}
						live={permissions[category]}
						decision={
							category === 'necessary'
								? undefined
								: choice?.categories[category]
						}
						onChange={(value) => draft.set(category, value)}
					/>
				))}
			</ul>

			<div className="preference-actions">
				{/* Stock actions with page styling: Save records the draft,
				    Reject records every optional category as off. */}
				<ConsentWidget.SaveButton
					noStyle
					className="button button-primary"
				>
					Save choices
				</ConsentWidget.SaveButton>
				<ConsentWidget.RejectButton
					noStyle
					className="button button-secondary"
				>
					Reject all optional
				</ConsentWidget.RejectButton>
				{draft.isDirty ? (
					<span className="unsaved">You have unsaved changes</span>
				) : null}
			</div>
		</>
	);
};

/**
 * The preference center as a section of the account page rather than a
 * dialog. `ConsentWidget.Root` provides the same draft the stock dialog
 * uses, so the switches and the Save button below share it.
 */
export const PrivacyPreferences = () => {
	// `null` until the policy resolves.
	const model = useModel();
	const hasConsentUI = useHasConsentUI();

	if (model === null) {
		return (
			<p
				className="preferences-loading"
				aria-busy="true"
			>
				Loading your choices…
			</p>
		);
	}
	if (!hasConsentUI) {
		return (
			<p className="notice">
				Where you are browsing from, Northwind needs no consent for optional
				cookies, so there is nothing to choose here.
			</p>
		);
	}

	return (
		<ConsentWidget.Root noStyle>
			<PreferenceForm />
		</ConsentWidget.Root>
	);
};
