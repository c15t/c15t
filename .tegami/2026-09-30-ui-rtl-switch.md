---
packages:
  '@c15t/ui': patch
  '@c15t/browser': patch
---

### Keep checked switches inside their track in right-to-left languages

In Arabic, Hebrew and other right-to-left copy, a checked switch in the preference dialog now moves its thumb to the left end of the track. The rule only matched a `dir` attribute on the switch itself, which no adapter sets, so the thumb slid past the track's edge.
