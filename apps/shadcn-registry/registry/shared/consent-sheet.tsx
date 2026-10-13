"use client"

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

  return (
    <Sheet
      open={dialog.isVisible}
      onOpenChange={(open) => {
        if (!open) {
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
