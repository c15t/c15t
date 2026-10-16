"use client"

import type { ReactNode } from "react"
import type { AllConsentNames } from "c15t/react"
import { useConsentGate } from "c15t/react/headless"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ConsentGate({
  category,
  children,
  className,
}: {
  category: AllConsentNames
  children: ReactNode
  className?: string
}) {
  const {
    state,
    categoryTitle,
    title,
    actionLabel,
    policyBlockedMessage,
    requestConsent,
  } = useConsentGate(category)

  if (state === "granted") return children
  if (state === "pending") return null

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border bg-muted/50 p-6 text-center text-sm",
        className
      )}
    >
      {state === "policy-blocked" ? (
        <p className="text-muted-foreground">{policyBlockedMessage}</p>
      ) : (
        <>
          <p className="font-medium">{title ?? categoryTitle}</p>
          <Button onPress={requestConsent}>
            {actionLabel ?? categoryTitle}
          </Button>
        </>
      )}
    </div>
  )
}
