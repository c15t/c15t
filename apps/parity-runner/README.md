# Cross-framework parity

The runner requires all 16 core stories in each configured React, Svelte, and Vue Storybook. A missing story or unavailable index fails discovery. Solid is excluded because it supplies primitives, not the core adapter contract.

Capture starts after story rendering and interaction play finish. It includes tagged UI roots portaled into the document body, their complete descendant trees, the accessibility tree, computed styles, dialog evidence, and per-framework screenshots. JSON attachments retain each framework's capture for review.

The DOM comparison recognizes these specific implementation equivalents:

- Generated IDs resolve to the referenced element's canonical test ID. A reference to the wrong control or content remains different.
- Native headings match explicit heading roles at the same level.
- Native dialogs and a framework's separate Content/Positioner arrangement share a canonical dialog root. Only the known container wrapper is flattened; extra classes, attributes, roles, or text remain visible. Actual role, name, description, modal state, focus, visibility, positioned shell bounds, and card bounds are compared separately. A card with `tabindex="-1"` remains outside sequential keyboard navigation; the actual focused node is still checked.
- Known visible-state classes and overlay transition metadata do not determine equality. Computed opacity and visibility still do.
- Explicit direction and inherited direction agree only when the computed direction agrees. Known banner/dialog context markers carry the same information as their canonical test IDs.
- A branding content wrapper can match direct children only for its exact built-in class and slot attributes. Unknown wrappers and content remain in the comparison.
- Hidden SVG labels and the built-in icon marker class are presentation metadata. SVG paths, view boxes, stroke/fill attributes, and actual size, position, computed paint, and transforms remain compared. Intrinsic dimensions can match CSS dimensions only at the same rendered bounds.
- Fixed trigger positions can use classes or inline coordinates when their actual bounds agree. Computed position and stacking order remain checked.
- Small switch variant classes can match the corresponding size attribute. Checked/disabled state remains in the DOM, and computed styles include the switch track and thumb.

Browser regressions cover incorrect dialog semantics, focus, visibility and geometry; wrong heading levels and ID references; changed SVG shape and position; substantive wrappers; and changed switch state or thumb styling. These rules do not permit blanket removal of attributes, classes, or descendants to make a failing story pass.
