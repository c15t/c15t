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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function ConsentDialog({ className }: { className?: string }) {
  const { dialog, closeUI } = useHeadlessConsentUI()
  const { common, consentManagerDialog } = useTranslations()

  // Blocking preferences stay open on an outside click. Radix and Base UI
  // report that click as a close request, so onOpenChange ignores close
  // requests while blocking, and Escape and the close button call closeUI.
  // This listens on the document because the click can move focus out of
  // the dialog.
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
    <Dialog
      open={dialog.isVisible}
      // Non-blocking preferences don't trap focus or lock page scroll.
      modal={dialog.blocking}
      onOpenChange={(open) => {
        if (!open && !dialog.blocking) {
          closeUI()
        }
      }}
    >
      <DialogContent
        // The built-in close button has an untranslated label.
        showCloseButton={false}
        className={cn("sm:max-w-lg", className)}
      >
        {/* Mounted per open, so each open starts from the saved consent. */}
        <ConsentDraftProvider>
          <DialogHeader className="pe-8">
            <DialogTitle>{consentManagerDialog.title}</DialogTitle>
            <DialogDescription>
              {consentManagerDialog.description}
            </DialogDescription>
          </DialogHeader>
          <ConsentPreferences className="max-h-[60vh] overflow-y-auto" />
          <DialogFooter>
            <ConsentPreferencesActions className="flex-1" />
          </DialogFooter>
        </ConsentDraftProvider>
        <ConsentBranding className="absolute top-full end-4 rounded-t-none border-t-0" />
        <DialogClose
          aria-label={common.close}
          onClick={closeUI}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "absolute top-2 end-2"
          )}
        >
          <XIcon />
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
