/**
 * Marks where `<ConsentBanner />` would have rendered, carrying its props as
 * JSON, so the browser can render the banner in the same spot.
 *
 * Its own module so the boot script can look for the spot without pulling
 * in the banner's class maps and stylesheet.
 */
export const PROMPT_SLOT_ATTRIBUTE = 'data-c15t-prompt-slot';
