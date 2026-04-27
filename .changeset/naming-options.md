---
"@c15t/backend": minor
"@c15t/cli": minor
---

Add a `naming` option to the c15t config so self-hosters can customize SQL and Mongo table/column identifiers (e.g. snake_case) without touching the ORM-facing API.

```ts
import { snakeCaseTables } from '@c15t/backend';

c15t({
  naming: {
    tables: snakeCaseTables(),
  },
});
```

- Bulk via utility (`snakeCaseTables()`, `lowerCaseTables()`), manual per-table overrides, or both via plain object spread.
- Only `sql` and `mongodb` identifiers are rewritten — the TypeScript ORM API stays camelCase, so application code is unaffected.
- Variants are computed against every known schema version, so columns added in newer versions (or removed in newer versions but still present during legacy → latest migrations) all receive the rename.
- Forwarded through the CLI's `read-config` so `c15t migrate` renders renamed migrations.
- Backwards compatible: omitting `naming` keeps the historical camelCase identifiers.
