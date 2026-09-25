---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/dev-tools":
    replay:
      - exit-prerelease(npm:@c15t/dev-tools)
  "@c15t/iab":
    replay:
      - exit-prerelease(npm:@c15t/iab)
  "@c15t/logger":
    replay:
      - exit-prerelease(npm:@c15t/logger)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/node-sdk":
    replay:
      - exit-prerelease(npm:@c15t/node-sdk)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
  "@c15t/scripts":
    replay:
      - exit-prerelease(npm:@c15t/scripts)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/translations":
    replay:
      - exit-prerelease(npm:@c15t/translations)
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
---

### Fix declaration imports for Node16 and NodeNext

Fix declaration imports for TypeScript consumers using Node16 or NodeNext resolution. Preserve explicit JavaScript filenames so exported APIs retain their types without requiring `skipLibCheck`.
