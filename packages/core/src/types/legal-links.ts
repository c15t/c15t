import type { LegalLinksTranslations } from '@c15t/translations';

export type LegalLink = {
	/** The URL or path to the legal link */
	href: string;

	/**
	 * The target of the legal link
	 * @defaultValue '_blank'
	 */
	target?: '_blank' | '_self';

	/**
	 * The rel of the legal link
	 */
	rel?: string;

	/**
	 * The label of the legal link
	 * This value overrides the translation for this link.
	 */
	label?: string;
};

export type LegalLinks = Partial<
	Record<keyof LegalLinksTranslations, LegalLink>
>;
