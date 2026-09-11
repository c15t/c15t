---
title: Legacy codemods
description: Preview and run explicit v1 to v2 source transforms.
group: cli
---
```bash
c15t codemods --list --json
c15t codemods component-renames --dry-run --json
```

These transforms target c15t v2. They are available from the command line and help output, but are omitted from the main onboarding menu. For v3, use the [agent migration workflow](../automation).

## Choose transforms

Pass one or more IDs from `--list`. Named transforms remain available after you update dependency versions, because the application source may still use the previous API.

To select all transforms applicable to the original version:

```bash
c15t codemods --all --from 1.9.0 --to 2.0.0 --dry-run --json
```

Review the proposed changes before repeating the command without `--dry-run`. Without `--from`, automatic selection uses the declared core/framework versions. Independently versioned integrations such as `@c15t/scripts` do not determine the application version.

## What changes

The collection covers component names, `activeUI`, consent categories, location overrides, hosted mode naming, React options, network blocking, translations, and stylesheet imports.

Component renames follow imported symbols and preserve local aliases, shadowed names, and object property keys. The hosted-mode rename only changes options passed to an identifiable c15t API. Custom wrappers may need manual migration.

Source transforms report original and proposed contents in JSON, except the stylesheet transform, which reports paths and change summaries. Multiple transforms share their source inventory and parser. Dry runs let later transforms see earlier proposed changes without saving application files.

The command fails if a transform reports file errors. Application is not a transaction across the full migration collection: review the working tree if a later transform fails after earlier transforms saved changes.
