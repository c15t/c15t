"use client"

import type { ReactNode } from "react"
import { ConsentProvider, hosted } from "c15t/react"

import { ConsentBanner } from "@/components/c15t/consent-banner"
import { ConsentDialog } from "@/components/c15t/consent-dialog"

const options = {
  // Asks VITE_C15T_BACKEND_URL for each visitor's policy.
  mode: hosted(),
}

export function ConsentManager({ children }: { children: ReactNode }) {
  return (
    <ConsentProvider options={options}>
      {children}
      <ConsentBanner />
      <ConsentDialog />
    </ConsentProvider>
  )
}
