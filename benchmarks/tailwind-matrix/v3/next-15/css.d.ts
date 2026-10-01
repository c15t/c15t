/**
 * Next 15's bundled typings only declare `*.module.css`. TypeScript 6 checks
 * side-effect imports by default, so the plain `styles.css` import needs this.
 */
declare module '*.css';
