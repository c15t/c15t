/**
 * Own Vue primitives (RFC 0003) — Reka-compatible export names so consent
 * components swap by import line only. Measured motivation: Reka's
 * tree-shaken cost for these five primitives was 52.5KB min / 16.5KB gz;
 * these implementations mirror the audited React equivalents at ~5x less.
 */
export { default as AccordionContent } from './accordion-content.vue';
export { default as AccordionItem } from './accordion-item.vue';
export { default as AccordionRoot } from './accordion-root.vue';
export { AccordionHeader, AccordionTrigger } from './accordion-trigger';
export { default as DialogContent } from './dialog-content.vue';
export { default as DialogOverlay } from './dialog-overlay.vue';
export { default as DialogPortal } from './dialog-portal.vue';
export { default as DialogRoot } from './dialog-root.vue';
export { default as FocusScope } from './focus-scope.vue';
export { default as PreferenceItemAuxiliary } from './preference-item/preference-item-auxiliary.vue';
export { default as PreferenceItemContent } from './preference-item/preference-item-content.vue';
export { default as PreferenceItemControl } from './preference-item/preference-item-control.vue';
export { default as PreferenceItemHeader } from './preference-item/preference-item-header.vue';
export { default as PreferenceItemLeading } from './preference-item/preference-item-leading.vue';
export { default as PreferenceItemMeta } from './preference-item/preference-item-meta.vue';
export { default as PreferenceItemRoot } from './preference-item/preference-item-root.vue';
export { default as PreferenceItemTitle } from './preference-item/preference-item-title.vue';
export { default as PreferenceItemTrigger } from './preference-item/preference-item-trigger.vue';
export { default as SwitchRoot } from './switch-root.vue';
export { default as TabsContent } from './tabs/tabs-content.vue';
export { default as TabsList } from './tabs/tabs-list.vue';
export { default as TabsRoot } from './tabs/tabs-root.vue';
export { default as TabsTrigger } from './tabs/tabs-trigger.vue';
export { default as SwitchThumb } from './switch-thumb.vue';
