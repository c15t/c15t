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
export { default as SwitchRoot } from './switch-root.vue';
export { default as SwitchThumb } from './switch-thumb.vue';
