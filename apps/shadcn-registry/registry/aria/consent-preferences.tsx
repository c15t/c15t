"use client"

import * as React from "react"
import { type PresentationAction, useConsentDraft } from "c15t/react"
import {
  useConsentLabels,
  useHeadlessConsentUI,
  useTranslations,
} from "c15t/react/headless"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export function ConsentPreferences({ className }: { className?: string }) {
  const { displayedCategories, values, set } = useConsentDraft()
  const { consentTypes } = useTranslations()
  const id = React.useId()

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {displayedCategories.map((category) => {
        const copy = consentTypes[category]
        const titleId = `${id}-${category}-title`
        const descriptionId = `${id}-${category}-description`

        return (
          <div
            key={category}
            className="flex items-start justify-between gap-4"
          >
            <div className="grid gap-1 text-start">
              <span id={titleId} className="font-medium">
                {copy?.title ?? category}
              </span>
              {copy?.description && (
                <span id={descriptionId} className="text-muted-foreground">
                  {copy.description}
                </span>
              )}
            </div>
            <Switch
              aria-labelledby={titleId}
              aria-describedby={copy?.description ? descriptionId : undefined}
              isSelected={values[category]}
              isDisabled={category === "necessary"}
              onChange={(isSelected) => set(category, isSelected)}
              className="mt-0.5"
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

  async function handlePress(action: PresentationAction) {
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
        <div
          key={group.join("-")}
          className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
        >
          {group.map((action) => (
            <Button
              key={action}
              variant={
                dialog.primaryActions.includes(action) ? "default" : "outline"
              }
              onPress={() => handlePress(action)}
            >
              {actions[action]}
            </Button>
          ))}
        </div>
      ))}
    </div>
  )
}
