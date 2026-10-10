---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
---

### A provider remounted right after a choice starts from that choice

When a provider remounted before persistence's write code had loaded, for
example because `onChoiceRecorded` changed the layout, the new provider read
storage that did not hold the choice yet. It could show the banner again or,
after a revocation, restore the earlier grant and run gated scripts until the
next reload. A provider mounted while another one's writes wait now starts
from that provider's records, revocations included. Its own later choices
still win, and the earlier writes keep the newer decision per category when
they land.
