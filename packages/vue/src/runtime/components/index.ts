// oxlint-disable oxc/no-barrel-file -- The components `c15t/vue/vue-plugin` exports.
/**
 * Every public component. `c15t/vue/vue-plugin` re-exports them; the
 * package is side-effect free outside its stylesheets, so a bundler keeps
 * only the components an app imports.
 */
export { default as ConsentActions } from './actions.vue';
export { default as ConsentBanner } from './prompt.vue';
export { default as ConsentBrandingIcon } from './branding-icon.vue';
export { default as ConsentButton } from './button.vue';
export { default as ConsentDescription } from './description.vue';
export { default as ConsentDialogLink } from './consent-dialog-link.vue';
export { default as ConsentDialogTrigger } from './panel-trigger.vue';
export { default as ConsentGate } from './consent-gate.vue';
export { default as ConsentLink } from './link.vue';
export { default as ConsentManager } from './manager.vue';
export { default as ConsentRoot } from './root.vue';
export { default as ConsentSwitch } from './switch.vue';
export { default as ConsentTag } from './tag.vue';
export { default as ConsentWidget } from './preferences.vue';
export { default as IABConsentBanner } from './iab-prompt.vue';
export { default as IABConsentDialog } from './iab-panel.vue';
