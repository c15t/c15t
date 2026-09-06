import extras from './extras.module.css';
/**
 * CSS-experiment shim: exposes the same style-map shape the
 * consent-banner components import from
 * `@c15t/ui/styles/components/consent-banner`, backed by
 * `@c15t/ui/styles/components` CSS Modules (the Vue CSS approach) instead of the
 * precompiled `@c15t/ui` monolith.
 *
 * Swapped in via bundler alias when the bench app is built with
 * `C15T_CSS=styles`. Same DOM, same data-testids — only CSS source and
 * delivery differ. The bench mounts `<ConsentBanner disableAnimation />`,
 * so enter/exit map to empty strings.
 */
import banner from '@c15t/ui/styles/components/consent-banner.module.css';

const styles: Record<string, string> = {
	acceptButton: extras.acceptButton ?? '',
	actionButtonFill: extras.actionButtonFill ?? '',
	bannerHidden: banner.bannerHidden ?? '',
	bannerVisible: banner.bannerVisible ?? '',
	bottomLeft: extras.bottomLeft ?? '',
	bottomRight: extras.bottomRight ?? '',
	card: banner.card ?? '',
	cardShell: banner.cardShell ?? '',
	customizeButton: extras.customizeButton ?? '',
	description: banner.description ?? '',
	enter: '',
	exit: '',
	footer: banner.footer ?? '',
	footerColumn: extras.footerColumn ?? '',
	footerFill: extras.footerFill ?? '',
	footerSubGroup: extras.footerSubGroup ?? '',
	footerSubGroupColumn: extras.footerSubGroupColumn ?? '',
	footerSubGroupFill: extras.footerSubGroupFill ?? '',
	header: banner.header ?? '',
	overlay: banner.overlay ?? '',
	rejectButton: extras.rejectButton ?? '',
	root: banner.root ?? '',
	title: banner.title ?? '',
	topLeft: extras.topLeft ?? '',
	topRight: extras.topRight ?? '',
};

export default styles;
