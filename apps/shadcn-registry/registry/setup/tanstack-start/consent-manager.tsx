import type { ReactNode } from "react"
import { createServerFn } from "@tanstack/react-start"
import { ConsentRoot } from "c15t/tanstack-start"
import {
  createConsentStateHandler,
  type ConsentState,
} from "c15t/tanstack-start/server"

import { ConsentBanner } from "@/components/c15t/consent-banner"
import { ConsentDialog } from "@/components/c15t/consent-dialog"

// Call from the root route's loader. Start's compiler finds server code by
// this call site, which is why it lives in your project and not in c15t.
export const getConsentState = createServerFn({ method: "GET" }).handler(
  createConsentStateHandler()
)

export function ConsentManager({
  state,
  children,
}: {
  state: ConsentState | Promise<ConsentState>
  children: ReactNode
}) {
  return (
    <ConsentRoot state={state}>
      {children}
      <ConsentBanner />
      <ConsentDialog />
    </ConsentRoot>
  )
}
