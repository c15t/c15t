# c15t GTM community template

`template.tpl` is the c15t Consent Management tag template for the Google Tag
Manager Community Template Gallery. It loads the `@c15t/browser` script-tag
build and forwards c15t's permissions to Google Consent Mode through the
existing `window.c15t` queue.

The `googleTagManager` helper stays the recommended setup. The template exists
for the gallery listing and for sites that manage scripts only through GTM. See
the [Google Tag Manager docs](https://c15t.com/docs/integrations/google-tag-manager#use-the-gtm-template-instead).

This directory is not in the package's `files`, so it is not published to npm.

## Test

```bash
bun run --cwd packages/browser test src/__tests__/gtm-template.test.ts \
	--coverage.enabled=false
```

The test runs the template's sandboxed code against the real `window.c15t`
global, with GTM's APIs emulated and its permissions enforced. It also replays
the scenarios in the template's `___TESTS___` section. In GTM, open the
template in the editor and use the Tests tab to run those scenarios against
the real sandbox.

## Publish to the gallery

The gallery reads templates from a public GitHub repository with
`template.tpl`, `metadata.yaml` and a `LICENSE` at its root.
[`inthhq/c15t-gtm-template`](https://github.com/inthhq/c15t-gtm-template) is
that repository. Keep it as a copy of this directory:

1. Copy `template.tpl` and the root `LICENSE` into the mirror repository and
   commit.
2. Add the commit's SHA to the top of `versions` in `metadata.yaml`, newest
   first:

   ```yaml
   homepage: https://c15t.com
   documentation: https://c15t.com/docs/integrations/google-tag-manager
   versions:
     - sha: <commit sha>
       changeNotes: Initial release.
   ```

3. Commit `metadata.yaml` and push. Later versions appear in the gallery once
   a new SHA is added to `metadata.yaml`.

The template was first submitted from the
[standalone gallery](https://tagmanager.google.com/gallery/) through
⋮ (More actions) → Submit template. The gallery inside a GTM workspace has no
submit option.
