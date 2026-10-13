"use client"

import { ConsentDraftProvider } from "c15t/react"
import { useHeadlessConsentUI, useTranslations } from "c15t/react/headless"
import { XIcon } from "lucide-react"

import { ConsentBranding } from "@/components/c15t/consent-branding"
import {
  ConsentPreferences,
  ConsentPreferencesActions,
} from "@/components/c15t/consent-preferences"
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export function ConsentDialog({ className }: { className?: string }) {
  const { dialog, closeUI } = useHeadlessConsentUI()
  const { common, consentManagerDialog } = useTranslations()

  return (
    <Dialog
      isOpen={dialog.isVisible}
      onOpenChange={(isOpen) => {
        if (!isOpen) closeUI()
      }}
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
        variant="ghost"
        size="icon-sm"
        aria-label={common.close}
        className="absolute top-2 end-2"
      >
        <XIcon />
      </DialogClose>
    </Dialog>
  )
}
