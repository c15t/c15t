/**
 * CSS-experiment shim: exposes the same style-map shape the v3
 * consent-banner components import from
 * `@c15t/ui/styles/components/consent-banner.module.js`, backed by
 * `@c15t/ui/styles/v3` CSS Modules (the Vue CSS approach) instead of the
 * precompiled `@c15t/ui` monolith.
 *
 * Swapped in via bundler alias when the bench app is built with
 * `C15T_CSS=styles`. Same DOM, same data-testids — only CSS source and
 * delivery differ. The bench mounts `<ConsentBanner disableAnimation />`,
 * so enter/exit map to empty strings.
 */
import banner from '@c15t/ui/styles/v3/consent-banner.module.css';
import extras from './extras.module.css';

const styles: Record<string, string> = {
	enter: '',
	exit: '',
	root: banner.root ?? '',
	bannerVisible: banner.bannerVisible ?? '',
	bannerHidden: banner.bannerHidden ?? '',
	bottomLeft: extras.bottomLeft ?? '',
	bottomRight: extras.bottomRight ?? '',
	topLeft: extras.topLeft ?? '',
	topRight: extras.topRight ?? '',
	card: banner.card ?? '',
	cardShell: banner.cardShell ?? '',
	rejectButton: extras.rejectButton ?? '',
	acceptButton: extras.acceptButton ?? '',
	customizeButton: extras.customizeButton ?? '',
	header: banner.header ?? '',
	footer: banner.footer ?? '',
	footerSubGroup: extras.footerSubGroup ?? '',
	footerFill: extras.footerFill ?? '',
	footerColumn: extras.footerColumn ?? '',
	footerSubGroupFill: extras.footerSubGroupFill ?? '',
	footerSubGroupColumn: extras.footerSubGroupColumn ?? '',
	actionButtonFill: extras.actionButtonFill ?? '',
	description: banner.description ?? '',
	title: banner.title ?? '',
	overlay: banner.overlay ?? '',
};

export default styles;
