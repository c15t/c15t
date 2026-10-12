---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Keep checked switches inside their track in right-to-left languages

In Arabic, Hebrew and other right-to-left copy, a checked switch in the
preference dialog moves its thumb to the left end of the track. Before, the
thumb slid past the track's edge.
