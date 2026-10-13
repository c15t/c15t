"use client"

import type { ReactNode } from "react"
import type { AllConsentNames } from "c15t/react"
import { useConsentGate } from "c15t/react/headless"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function ConsentGate({
  category,
  children,
  className,
}: {
  category: AllConsentNames
  children: ReactNode
  className?: string
}) {
  const gate = useConsentGate(category)

  if (gate.state === "granted") {
    return children
  }

  if (gate.state === "pending") {
    return null
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border bg-muted/50 p-6 text-center text-sm",
        className
      )}
    >
      {gate.state === "denied" ? (
        <>
          <p className="font-medium">{gate.title ?? gate.categoryTitle}</p>
          <Button onClick={gate.requestConsent}>
            {gate.actionLabel ?? gate.categoryTitle}
          </Button>
        </>
      ) : (
        <p className="text-muted-foreground">{gate.policyBlockedMessage}</p>
      )}
    </div>
  )
}
