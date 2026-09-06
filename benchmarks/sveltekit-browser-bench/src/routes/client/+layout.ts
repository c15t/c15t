/**
 * SPA arm: no server render at all, so the kernel boots cold in the browser
 * and pays one `/init` request.
 */
export const ssr = false;
