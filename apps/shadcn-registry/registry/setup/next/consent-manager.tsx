import type { ReactNode } from "react"
import { ConsentRoot } from "c15t/next"
import { resolveConsent } from "c15t/next/server"

import { ConsentBanner } from "@/components/c15t/consent-banner"
import { ConsentDialog } from "@/components/c15t/consent-dialog"

export function ConsentManager({ children }: { children: ReactNode }) {
  return (
    // Not awaited: the page renders while consent resolves.
    <ConsentRoot state={resolveConsent()}>
      {children}
      <ConsentBanner />
      <ConsentDialog />
    </ConsentRoot>
  )
}
