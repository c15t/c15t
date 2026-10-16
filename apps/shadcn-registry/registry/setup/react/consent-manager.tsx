"use client"

import type { ReactNode } from "react"
import type { ConsentProviderOptions } from "c15t/react"
import { ConsentProvider, hosted } from "c15t/react"

import { ConsentBanner } from "@/components/c15t/consent-banner"
import { ConsentDialog } from "@/components/c15t/consent-dialog"
import { ConsentDialogTrigger } from "@/components/c15t/consent-dialog-trigger"

const options: ConsentProviderOptions = {
  // Asks VITE_C15T_BACKEND_URL for each visitor's policy.
  mode: hosted(),
}

export function ConsentManager({ children }: { children: ReactNode }) {
  return (
    <ConsentProvider options={options}>
      {children}
      <ConsentBanner />
      <ConsentDialog />
      <ConsentDialogTrigger showWhen="after-prompt" />
    </ConsentProvider>
  )
}
