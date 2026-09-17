---
"@c15t/astro": patch
"@c15t/backend": patch
"@c15t/browser": patch
"@c15t/cli": patch
"@c15t/core": patch
"@c15t/dev-tools": patch
"@c15t/iab": patch
"@c15t/logger": patch
"@c15t/nextjs": patch
"@c15t/node-sdk": patch
"@c15t/react": patch
"@c15t/schema": patch
"@c15t/scripts": patch
"@c15t/tanstack-start": patch
"@c15t/translations": patch
"@c15t/ui": patch
---

Fix declaration imports for TypeScript consumers using Node16 or NodeNext resolution. Preserve explicit JavaScript filenames so exported APIs retain their types without requiring `skipLibCheck`.
