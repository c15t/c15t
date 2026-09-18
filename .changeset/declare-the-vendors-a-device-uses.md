---
"@c15t/backend": patch
---

`/init` narrows the vendor list per request. A client that sends `x-c15t-vendors: 7, 41` is served the intersection of those ids and the deployment's `gvl.vendorIds`. This is not a smaller version of what a browser does: a browser asks the GVL endpoint for its own scope, and a native app cannot, so the document `/init` embeds is the only vendor list a device will ever hold, arriving over a connection the visitor did not choose. Before this, the only scope a deployment could serve was the one it had configured, which means an app rendering three partners received every vendor the publisher had ever allowlisted.

The header is comma-separated decimal ids, deduplicated, capped at the 500 ids the upstream `?vendorIds=` filter already carries. An unreadable value and an absent one get the same answer, which is the configured scope: a value is dropped whole rather than truncated, and the request is never rejected. `/init` sits on the critical rendering path, where the failure mode of a strict parser is a visitor with no consent UI at all, so a device built against the wrong constant is served the list it was served yesterday. `Vary` now names the header, and `Cache-Control: no-store` is unchanged.

The cache sees none of this. Documents are stored under the key the configured scope produces and narrowed after the lookup, so a declared scope cannot mint cache entries and the upstream fetch count stays a function of publisher configuration rather than of whatever clients send. One consequence is worth naming: an empty declared scope behaves exactly like an absent one. Both narrowers read a scope with nothing in it as no filter at all, so the configured scope is what comes back. The header asks for fewer vendors. It cannot ask for none.
