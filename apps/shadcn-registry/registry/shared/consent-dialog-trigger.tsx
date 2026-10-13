"use client"

import {
  useConsentDialogTrigger,
  useConsentLabels,
} from "c15t/react/headless"

import { cn } from "@/lib/utils"
import { ConsentBrandingMark } from "@/components/c15t/consent-branding"
import { Button } from "@/components/ui/button"

export function ConsentDialogTrigger({ className }: { className?: string }) {
  const { isVisible, openDialog } = useConsentDialogTrigger()
  const { preferenceControls } = useConsentLabels()

  if (!isVisible) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="icon-lg"
      aria-label={preferenceControls.preferences}
      className={cn(
        "fixed end-4 bottom-4 z-40 rounded-full shadow-lg",
        className
      )}
      onClick={openDialog}
    >
      <ConsentBrandingMark className="size-5" />
    </Button>
  )
}
