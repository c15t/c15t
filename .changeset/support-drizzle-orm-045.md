---
"@c15t/backend": patch
---

# Support drizzle-orm 0.45.x

Bump `fumadb` from 0.2.2 to 0.3.0, which widens its optional peer dependency ranges to `drizzle-orm@^0.44.0 || ^0.45.0`, `prisma@6.x.x || 7.x.x`, and `mongodb@6.x.x || 7.x.x`. This fixes the unmet peer dependency error when installing `@c15t/backend` alongside drizzle-orm 0.45.x.
