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
  Sheet,
  SheetClose,
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
  const descriptionId = React.useId()
  // shadcn's Sheet gives the inner React Aria dialog no props, so the
  // description reaches it through context.
  const dialogContext = React.useMemo(
    () => ({ "aria-describedby": descriptionId }),
    [descriptionId]
  )

  return (
    <DialogContext.Provider value={dialogContext}>
      {/* React Aria's Modal is always modal, so this ignores dialog.blocking. */}
      <Sheet
        side={side}
        isOpen={dialog.isVisible}
        onOpenChange={(isOpen) => {
          if (!isOpen) closeUI()
        }}
        // The built-in close button has an untranslated label.
        showCloseButton={false}
        className={className}
      >
        {/* Mounted per open, so each open starts from the saved consent. */}
        <ConsentDraftProvider>
          <SheetHeader className="pe-12">
            <SheetTitle>{consentManagerDialog.title}</SheetTitle>
            <SheetDescription id={descriptionId}>
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
          variant="ghost"
          size="icon-sm"
          aria-label={common.close}
          className="absolute top-3 end-3"
        >
          <XIcon />
        </SheetClose>
      </Sheet>
    </DialogContext.Provider>
  )
}
