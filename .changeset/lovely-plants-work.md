---
"@c15t/nextjs": patch
"@c15t/react": patch
---

Fix theme inheritance in ConsentManagerWidget and ConsentManagerDialog

ConsentManagerWidget and ConsentManagerDialog components now properly inherit themes from ConsentManagerProvider context, matching CookieBanner behavior. Previously, these components ignored global themes and only used local theme props.

- Add explicit theme merging using useTheme() hook in ConsentManagerWidget
- Add explicit theme merging using useTheme() hook in ConsentManagerDialog  
- Standardize CookieBanner to use same explicit theme merging pattern
- Ensure local themes take precedence over global themes in all components
- Maintain backward compatibility - no breaking changes to existing APIs

This ensures that themes set in `ConsentManagerProvider` options.react.theme now properly flow to all components (Banner, Widget, and Dialog) while still allowing individual components to override with local themes.