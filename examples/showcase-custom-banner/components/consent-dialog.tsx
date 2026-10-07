'use client';

import {
	ConsentDraftProvider,
	useConsentDraft,
	useDeclaredVendors,
} from 'c15t/next';
import type { AllConsentNames } from 'c15t/next';
import {
	useFocusTrap,
	useHeadlessConsentUI,
	useTranslations,
} from 'c15t/next/headless';
import type { HeadlessConsentSurfaceAction } from 'c15t/next/headless';
import { useEffect, useId, useRef, useState } from 'react';
import type { RefObject } from 'react';

import { usePresence } from '@/lib/use-presence';

import styles from './consent-dialog.module.css';

type Step = 'banner' | 'dialog';

const actionLabels: Record<
	Step,
	Record<HeadlessConsentSurfaceAction, string>
> = {
	banner: {
		accept: 'Accept',
		customize: 'Choose',
		dismiss: 'OK',
		reject: 'Reject',
		save: 'Save choices',
	},
	dialog: {
		accept: 'Accept all',
		customize: 'Choose',
		dismiss: 'OK',
		reject: 'Reject all',
		save: 'Save choices',
	},
};

const preferenceLabels = {
	'opt-out': 'Do not sell or share my data',
	preferences: 'Choose',
} as const;

// Northwind's own words for each category. Anything not listed here falls
// back to c15t's translated title and description.
const categoryCopy: Partial<
	Record<AllConsentNames, { title: string; description: string }>
> = {
	experience: {
		description: 'Lets us test new page layouts and coffee recommendations.',
		title: 'Experience',
	},
	functionality: {
		description: 'Remembers your grind, brew method and delivery address.',
		title: 'Preferences',
	},
	marketing: {
		description: 'Measures our ads and shows them to you on other sites.',
		title: 'Marketing',
	},
	measurement: {
		description:
			'Shows us which coffees people look at and where the shop gets confusing.',
		title: 'Analytics',
	},
	necessary: {
		description: 'Keeps your cart, checkout and account working.',
		title: 'Essential',
	},
};

/**
 * While a blocking surface is open, the rest of the page can't be clicked,
 * focused, read by a screen reader or scrolled. Every sibling of the
 * dialog, and of each of its ancestors up to `<body>`, becomes `inert`.
 * Hiding the scrollbar would widen the page, so `<body>` gets padding of
 * the scrollbar's width while it's gone.
 */
const useBlockPage = function useBlockPage(
	active: boolean,
	rootRef: RefObject<HTMLElement | null>
) {
	useEffect(() => {
		const root = rootRef.current;
		if (!active || !root) {
			return;
		}
		const blocked: HTMLElement[] = [];
		for (
			let node: HTMLElement = root;
			node.parentElement && node !== document.body;
			node = node.parentElement
		) {
			for (const sibling of node.parentElement.children) {
				if (
					sibling !== node &&
					sibling instanceof HTMLElement &&
					!sibling.inert
				) {
					sibling.setAttribute('inert', '');
					blocked.push(sibling);
				}
			}
		}
		const html = document.documentElement;
		const { body } = document;
		const scrollbarWidth = window.innerWidth - html.clientWidth;
		const { overflow } = html.style;
		const { paddingRight } = body.style;
		html.style.overflow = 'hidden';
		if (scrollbarWidth > 0) {
			body.style.paddingRight = `${scrollbarWidth}px`;
		}
		return () => {
			html.style.overflow = overflow;
			body.style.paddingRight = paddingRight;
			for (const element of blocked) {
				element.removeAttribute('inert');
			}
		};
	}, [active, rootRef]);
};

const CategoryList = ({ step }: { step: Step }) => {
	const draft = useConsentDraft();
	const { consentTypes } = useTranslations();
	const vendors = useDeclaredVendors();

	return (
		<ul className={styles.list}>
			{draft.displayedCategories.map((category) => {
				const copy = categoryCopy[category];
				const title = copy?.title ?? consentTypes[category]?.title ?? category;
				const description =
					copy?.description ?? consentTypes[category]?.description;
				const uses = vendors
					.filter((vendor) => vendor.category === category)
					.map((vendor) => vendor.name ?? vendor.id);
				const titleId = `consent-category-${category}`;
				const descriptionId = `${titleId}-description`;

				let control = <span className={styles.status}>Optional</span>;
				if (category === 'necessary') {
					control = <span className={styles.status}>Always on</span>;
				} else if (step === 'dialog') {
					control = (
						<button
							type="button"
							role="switch"
							className={styles.switch}
							aria-checked={draft.values[category]}
							aria-labelledby={titleId}
							aria-describedby={descriptionId}
							onClick={() => draft.set(category, !draft.values[category])}
						>
							<span className={styles.thumb} />
						</button>
					);
				}

				return (
					<li
						key={category}
						className={styles.row}
					>
						<div className={styles.rowText}>
							<span
								id={titleId}
								className={styles.rowTitle}
							>
								{title}
							</span>
							<span
								id={descriptionId}
								className={styles.rowDescription}
							>
								{description}
								{uses.length > 0 ? ` Uses ${uses.join(', ')}.` : null}
							</span>
						</div>
						{control}
					</li>
				);
			})}
		</ul>
	);
};

const Actions = ({ step }: { step: Step }) => {
	// Called inside the draft provider, so `performAction('save')` saves the
	// switches rather than a fresh copy of the stored choice.
	const { banner, dialog, openDialog, performAction } = useHeadlessConsentUI();
	const surface = step === 'banner' ? banner : dialog;

	// The policy decides which actions this visitor gets, how they group and
	// in what order. Accept and reject always share a group and a style.
	return (
		<div className={styles.actions}>
			{surface.actionGroups.map((group) => (
				<div
					key={group.join('-')}
					className={styles.group}
				>
					{group.map((action) => (
						<button
							key={action}
							type="button"
							className={styles.button}
							data-primary={
								surface.primaryActions.includes(action) || undefined
							}
							onClick={() => performAction(action)}
						>
							{actionLabels[step][action]}
						</button>
					))}
				</div>
			))}
			{step === 'banner' && banner.preferenceControls.length > 0 ? (
				<div className={styles.group}>
					{banner.preferenceControls.map((control) => (
						<button
							key={control}
							type="button"
							className={styles.button}
							onClick={openDialog}
						>
							{preferenceLabels[control]}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
};

const StaleNotice = () => {
	const draft = useConsentDraft();
	if (!draft.isStale) {
		return null;
	}
	return (
		<p className={styles.notice}>
			Our cookie list changed while this was open.{' '}
			<button
				type="button"
				className={styles.inlineLink}
				onClick={() => draft.reset()}
			>
				Review it again
			</button>
		</p>
	);
};

const BackIcon = () => (
	<svg
		viewBox="0 0 16 16"
		width="16"
		height="16"
		aria-hidden="true"
	>
		<path
			d="M10 3.5 5.5 8l4.5 4.5"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

const CloseIcon = () => (
	<svg
		viewBox="0 0 16 16"
		width="16"
		height="16"
		aria-hidden="true"
	>
		<path
			d="M4 4l8 8M12 4l-8 8"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
		/>
	</svg>
);

/**
 * Northwind's consent dialog: one centered modal for both of c15t's
 * surfaces. The banner surface is the first step (the question, the
 * categories and the policy's actions). "Choose" moves c15t to the dialog
 * surface, and the same modal turns each category into a switch.
 */
export const ConsentDialog = () => {
	const { banner, closeUI, dialog } = useHeadlessConsentUI();
	let current: Step | null = null;
	if (dialog.isVisible) {
		current = 'dialog';
	} else if (banner.isVisible) {
		current = 'banner';
	}
	const isOpen = current !== null;
	const isMounted = usePresence(isOpen, 160);
	const rootRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const titleId = useId();
	const introId = useId();

	// Keep showing the last step while the modal animates out, and remember
	// whether the dialog step was reached from the banner step.
	const [previous, setPrevious] = useState(current);
	const [shown, setShown] = useState({
		fromBanner: false,
		step: current ?? 'banner',
	});
	if (current !== previous) {
		setPrevious(current);
		if (current) {
			setShown({
				fromBanner: previous === 'banner' && current === 'dialog',
				step: current,
			});
		}
	}
	const { fromBanner, step } = shown;

	const isModal = (step === 'banner' ? banner : dialog).blocking;
	const blocking = isOpen && isModal;

	// Focus starts on the dialog itself, so no action is favored, and goes
	// back where it was when the modal closes. The trap runs first so it
	// records that element before the page goes inert.
	useFocusTrap(blocking, panelRef);
	useBlockPage(blocking, rootRef);

	// Changing step unmounts the button that had focus. Put focus back on
	// the panel whenever it ends up outside the open modal.
	useEffect(() => {
		const panel = panelRef.current;
		if (blocking && panel && !panel.contains(document.activeElement)) {
			panel.focus({ preventScroll: true });
		}
	});

	// On the banner step the visitor still owes an answer, so Escape does
	// nothing. On the dialog step it calls `closeUI()`: c15t goes back to
	// the banner step while the answer is owed, and closes the modal once
	// the visitor has chosen (when it was opened from Privacy settings).
	useEffect(() => {
		if (!isOpen) {
			return;
		}
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') {
				return;
			}
			event.preventDefault();
			if (step === 'dialog') {
				closeUI();
			}
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [isOpen, step, closeUI]);

	if (!isMounted) {
		return null;
	}

	return (
		<div
			ref={rootRef}
			className={styles.root}
			data-state={isOpen ? 'open' : 'closed'}
		>
			{isModal ? (
				<div
					className={styles.backdrop}
					aria-hidden="true"
				/>
			) : null}
			<div
				ref={panelRef}
				className={styles.panel}
				// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- useFocusTrap, useBlockPage and the Escape handler make this modal, so it can stay mounted while it animates out.
				role="dialog"
				aria-modal={blocking || undefined}
				aria-labelledby={titleId}
				aria-describedby={introId}
				tabIndex={-1}
			>
				{/* One draft per opening: the switches stage into it and Save
				    records it, so nothing is stored until the visitor confirms. */}
				<ConsentDraftProvider>
					<div className={styles.body}>
						<header className={styles.header}>
							<div className={styles.titleRow}>
								{step === 'dialog' && fromBanner ? (
									<button
										type="button"
										className={styles.iconButton}
										data-side="start"
										aria-label="Back"
										onClick={closeUI}
									>
										<BackIcon />
									</button>
								) : null}
								<h2
									id={titleId}
									className={styles.title}
								>
									{step === 'banner'
										? 'Can we use analytics cookies?'
										: 'Cookie choices'}
								</h2>
								{step === 'dialog' && !fromBanner ? (
									<button
										type="button"
										className={styles.iconButton}
										data-side="end"
										aria-label="Close"
										onClick={closeUI}
									>
										<CloseIcon />
									</button>
								) : null}
							</div>
							<p
								id={introId}
								className={styles.intro}
							>
								{step === 'banner'
									? "We'd like to measure how people use the shop. Nothing is measured unless you say yes, and you can change your answer under Privacy settings at the bottom of any page."
									: "Essential cookies stay on so your cart and checkout work. Turn on anything else you're happy with."}
							</p>
						</header>
						<StaleNotice />
						<CategoryList step={step} />
					</div>
					<Actions step={step} />
				</ConsentDraftProvider>
			</div>
		</div>
	);
};
