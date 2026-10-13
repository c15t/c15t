"use client"

import * as React from "react"
import { ConsentDraftProvider } from "c15t/react"
import { useHeadlessConsentUI, useTranslations } from "c15t/react/headless"
import { XIcon } from "lucide-react"
import { DialogContext } from "react-aria-components"

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
  const descriptionId = React.useId()
  // shadcn's Dialog gives the inner React Aria dialog no props, so the
  // description reaches it through context.
  const dialogContext = React.useMemo(
    () => ({ "aria-describedby": descriptionId }),
    [descriptionId]
  )

  return (
    <DialogContext.Provider value={dialogContext}>
      {/* React Aria's Modal is always modal, so this ignores dialog.blocking. */}
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
            <DialogDescription id={descriptionId}>
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
    </DialogContext.Provider>
  )
}
