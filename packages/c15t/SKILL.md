---
name: c15t-docs
description: Read and search the c15t documentation. Use when working with c15t — its setup, configuration, API, and behavior.
---
# c15t documentation

The c15t umbrella package — the headless consent engine, React consent UI, the Next.js integration, and the Vue/Nuxt module in one install. Every subpath mirrors its scoped package one-to-one.

The umbrella ships no docs of its own; the full documentation is bundled with the scoped packages it installs alongside itself:

- Start with `./AGENTS.md`; it maps every umbrella subpath to its scoped package and indexes their bundled docs (`node_modules/@c15t/core`, `node_modules/@c15t/react`, `node_modules/@c15t/nextjs`).
- Prefer those local files over fetching anything over the network — they are version-matched to the installed code.
