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
`template.tpl`, `metadata.yaml` and a `LICENSE` at its root. Keep that
repository, such as `c15t/gtm-template`, as a copy of this directory:

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

3. Commit `metadata.yaml`. For the first release, open the gallery in GTM,
   choose Submit Template from the ⋮ menu and enter the repository URL. Later
   versions appear once a new SHA is added to `metadata.yaml`.
