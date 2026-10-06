---
packages:
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Fix generated React and Next.js styles

Render theme preset tokens with ConsentTheme and use important utility modifiers
for the Tailwind CSS 3 preset. Choosing None keeps the default c15t theme, including
with compound components. Find global stylesheets through semicolon-free imports
and tsconfig or jsconfig aliases, and show a setup warning when the stylesheet
cannot be found.

Move the starter universal margin and padding reset into the base layer for
Tailwind CSS 4 and plain CSS apps, so it no longer collapses the banner and dialog.

Recognize Tailwind 3 comparator ranges, skip stylesheet aliases outside the app,
and report only the stylesheet edits setup actually makes.
