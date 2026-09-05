# Cross-framework parity

The runner requires all 16 core stories in each configured React, Svelte, and Vue Storybook. A missing story or unavailable index fails discovery. Solid is excluded because it supplies primitives, not the core adapter contract.

Capture starts after story rendering and interaction play finish. It includes tagged UI roots portaled into the document body, their complete descendant trees, the accessibility tree, computed styles, dialog evidence, and per-framework screenshots. JSON attachments retain each framework's capture for review.

The DOM comparison recognizes these specific implementation equivalents:

- Generated IDs resolve to the referenced element's canonical test ID. A reference to the wrong control or content remains different.
- Native headings match explicit heading roles at the same level.
- Native dialogs and a framework's separate Content/Positioner arrangement share a canonical dialog root. Only the known container wrapper is flattened; extra classes, attributes, roles, or text remain visible. Actual role, name, description, modal state, focus, visibility, positioned shell bounds, and card bounds are compared separately. A card with `tabindex="-1"` remains outside sequential keyboard navigation; the actual focused node is still checked.
- Known visible-state classes and overlay transition metadata do not determine equality. Computed opacity and visibility still do, including the product of every ancestor opacity on the actual card. Focus evidence includes the actual control role, name, relationships, and child path beneath its nearest test ID, so two untagged controls cannot collapse into one identity.
- Explicit direction and inherited direction agree only when the computed direction agrees. Known banner/dialog context markers carry the same information as their canonical test IDs.
- A branding content wrapper can match direct children only for its exact built-in class and slot attributes. Unknown wrappers and content remain in the comparison.
- Hidden SVG labels and the built-in icon marker class are presentation metadata. SVG paths, view boxes, stroke/fill attributes, and actual size, position, computed paint, and transforms remain compared. Intrinsic dimensions can match CSS dimensions only at the same rendered bounds.
- Fixed trigger positions can use classes or inline coordinates when their actual bounds agree. Computed position and stacking order remain checked.
- Small switch variant classes can match the corresponding size attribute. Checked/disabled state remains in the DOM, and computed styles include the switch track and thumb.

Browser regressions cover incorrect dialog semantics, focus, visibility and geometry; wrong heading levels and ID references; changed SVG shape and position; substantive wrappers; and changed switch state or thumb styling. These rules do not permit blanket removal of attributes, classes, or descendants to make a failing story pass.

# Cross-framework comparisons

Start the React, Svelte, and Vue Storybooks, then run:

```sh
PARITY_FRAMEWORKS=react,svelte,vue bun run --cwd apps/parity-runner test:parity
```

The default URLs are ports 6006, 6007, and 6008. Override them with
`REACT_STORYBOOK_URL`, `SVELTE_STORYBOOK_URL`, and `VUE_STORYBOOK_URL`.

## DevTools

Run just the DevTools comparisons:

```sh
PARITY_FRAMEWORKS=react,svelte,vue bun run --cwd apps/parity-runner test:parity devtools.spec.ts
```

This checks all seven tabs and the circular launcher at desktop and mobile
sizes, in light and dark mode. It compares the floating panel itself, including
its portaled content, through DOM, accessibility, computed styles, and exact
screenshots. It also rejects horizontal overflow and off-screen placement.

React is the reference for each browser run. Screenshots are attached to the
Playwright report, so no OS-specific baseline update is needed. These checks
still run when CI passes `--ignore-snapshots`. They detect differences between
frameworks, not a visual change shared by every framework. Revision counters,
generated instance IDs, and anonymized script IDs are normalized; event history
is cleared before comparison.

Storybook's `devtools` stories also run the shared consent/script interaction
contract in each framework. React has a separate story using the real TanStack
Devtools host, including host unmount/remount. That story is tested for behavior
and deliberately excluded from visual comparisons.

```sh
STORYBOOK_URL=http://127.0.0.1:6006 bun run --cwd apps/storybook-react test-storybook --includeTags devtools
```
