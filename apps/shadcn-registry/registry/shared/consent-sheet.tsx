"use client"

import { useEffect } from "react"
import { ConsentDraftProvider, useTranslations } from "c15t/react"
import { useHeadlessConsentUI } from "c15t/react/headless"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { ConsentBranding } from "@/components/c15t/consent-branding"
import {
  ConsentPreferences,
  ConsentPreferencesActions,
} from "@/components/c15t/consent-preferences"
import { buttonVariants } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function ConsentSheet({
  className,
  side = "right",
}: {
  className?: string
  side?: "left" | "right"
}) {
  const { dialog, closeUI } = useHeadlessConsentUI()
  const { common, consentManagerDialog } = useTranslations()

  // Blocking preferences stay open on an outside click. Radix and Base UI
  // report that click as a close request, so onOpenChange ignores close
  // requests while blocking, and Escape and the close button call closeUI.
  // This listens on the document because the click can move focus out of
  // the sheet.
  useEffect(() => {
    if (!dialog.isVisible || !dialog.blocking) {
      return
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeUI()
      }
    }
    document.addEventListener("keydown", closeOnEscape)
    return () => document.removeEventListener("keydown", closeOnEscape)
  }, [dialog.isVisible, dialog.blocking, closeUI])

  return (
    <Sheet
      open={dialog.isVisible}
      // Non-blocking preferences don't trap focus or lock page scroll.
      modal={dialog.blocking}
      onOpenChange={(open) => {
        if (!open && !dialog.blocking) {
          closeUI()
        }
      }}
    >
      <SheetContent
        side={side}
        // The built-in close button has an untranslated label.
        showCloseButton={false}
        className={className}
      >
        {/* Mounted per open, so each open starts from the saved consent. */}
        <ConsentDraftProvider>
          <SheetHeader className="pe-12">
            <SheetTitle>{consentManagerDialog.title}</SheetTitle>
            <SheetDescription>
              {consentManagerDialog.description}
            </SheetDescription>
          </SheetHeader>
          <ConsentPreferences className="flex-1 overflow-y-auto px-4" />
          <SheetFooter>
            <ConsentPreferencesActions />
            <ConsentBranding className="self-center" />
          </SheetFooter>
        </ConsentDraftProvider>
        <SheetClose
          aria-label={common.close}
          onClick={closeUI}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "absolute top-3 end-3"
          )}
        >
          <XIcon />
        </SheetClose>
      </SheetContent>
    </Sheet>
  )
}
