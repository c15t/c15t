"use client"

import { useId } from "react"
import type { PresentationAction } from "c15t/react"
import { useConsentDraft, useTranslations } from "c15t/react"
import { useConsentLabels, useHeadlessConsentUI } from "c15t/react/headless"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

export function ConsentPreferences({ className }: { className?: string }) {
  const id = useId()
  const draft = useConsentDraft()
  const { consentTypes } = useTranslations()

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {draft.displayedCategories.map((category) => {
        const titleId = `${id}-${category}-title`
        const descriptionId = `${id}-${category}-description`

        return (
          <div
            key={category}
            className="flex items-start justify-between gap-4"
          >
            <div className="grid gap-1 text-start">
              <span id={titleId} className="font-medium">
                {consentTypes[category]?.title ?? category}
              </span>
              {consentTypes[category]?.description && (
                <span id={descriptionId} className="text-muted-foreground">
                  {consentTypes[category].description}
                </span>
              )}
            </div>
            <Switch
              aria-labelledby={titleId}
              aria-describedby={
                consentTypes[category]?.description ? descriptionId : undefined
              }
              checked={draft.values[category]}
              disabled={category === "necessary"}
              onCheckedChange={(checked) => draft.set(category, checked)}
            />
          </div>
        )
      })}
    </div>
  )
}

export function ConsentPreferencesActions({
  className,
  onComplete,
}: {
  className?: string
  onComplete?: () => void
}) {
  const draft = useConsentDraft()
  const { dialog, performAction } = useHeadlessConsentUI()
  const { actions } = useConsentLabels()

  async function handleAction(action: PresentationAction) {
    const result = await performAction(action)
    if (result?.ok) {
      onComplete?.()
    } else if (draft.isStale) {
      // The policy changed under these edits and save refused them. Reload
      // the current choices so the visitor reviews them before saving again.
      draft.reset()
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between",
        className
      )}
    >
      {dialog.actionGroups.map((group) => (
        <div key={group.join("-")} className="flex flex-col gap-2 sm:flex-row">
          {group.map((action) => (
            <Button
              key={action}
              variant={
                dialog.primaryActions.includes(action) ? "default" : "outline"
              }
              onClick={() => handleAction(action)}
            >
              {actions[action]}
            </Button>
          ))}
        </div>
      ))}
    </div>
  )
}
