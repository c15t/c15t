"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import {
  type AllConsentNames,
  type PresentationAction,
  useConsentDraft,
  useDeclaredVendors,
} from "c15t/react"
import {
  type ResolvedVendor,
  useConsentLabels,
  useHeadlessConsentUI,
  useTranslations,
  vendorsListedUnder,
} from "c15t/react/headless"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

// The copy the stock dialog falls back to when the translations leave
// consentManagerDialog.vendors out.
const defaultVendorCopy = {
  disabledByCategory: "Turn on this category to choose vendors.",
  privacyPolicy: "Privacy policy",
  switchLabel: "Allow {vendor}",
  title: "Vendors ({count})",
}

/**
 * The vendors declared under one category, each with its own switch. The
 * switches stage grants on the same draft as the category switches, so one
 * save records both. They're disabled while the category is off, since a
 * vendor grant never turns its category on.
 */
function ConsentVendors({
  category,
  vendors,
}: {
  category: AllConsentNames
  vendors: ResolvedVendor[]
}) {
  const { values, vendors: granted, setVendor } = useConsentDraft()
  const { consentManagerDialog } = useTranslations()
  const id = React.useId()
  const copy = { ...defaultVendorCopy, ...consentManagerDialog.vendors }
  const categoryOn = values[category] === true
  const title = copy.title.replace("{count}", String(vendors.length))

  return (
    <details className="group rounded-lg border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-start font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDownIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <section
        aria-label={title}
        className="grid gap-3 border-t px-3 py-3 text-start"
      >
        {!categoryOn && (
          <p className="text-xs text-muted-foreground">
            {copy.disabledByCategory}
          </p>
        )}
        {vendors.map((vendor) => {
          const name = vendor.name ?? vendor.id
          const nameId = `${id}-${vendor.id}-name`

          return (
            <div key={vendor.id} className="grid gap-1">
              <div className="flex items-center justify-between gap-4">
                <span id={nameId} className="font-medium">
                  {name}
                </span>
                {/* A vendor declared disabled has no switch, since c15t ignores grants for it. */}
                {vendor.disabled !== true && (
                  <Switch
                    size="sm"
                    aria-label={copy.switchLabel.replace("{vendor}", name)}
                    aria-describedby={nameId}
                    isSelected={granted[vendor.id] ?? true}
                    isDisabled={!categoryOn}
                    onChange={(isSelected) => setVendor(vendor.id, isSelected)}
                  />
                )}
              </div>
              {vendor.description && (
                <p className="text-xs text-muted-foreground">
                  {vendor.description}
                </p>
              )}
              {vendor.privacyPolicyUrl && (
                <a
                  href={vendor.privacyPolicyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-fit text-xs underline underline-offset-4 hover:text-foreground"
                >
                  {copy.privacyPolicy}
                </a>
              )}
            </div>
          )
        })}
      </section>
    </details>
  )
}

export function ConsentPreferences({ className }: { className?: string }) {
  const { displayedCategories, values, set } = useConsentDraft()
  const declaredVendors = useDeclaredVendors()
  const { consentTypes } = useTranslations()
  const id = React.useId()

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {displayedCategories.map((category) => {
        const copy = consentTypes[category]
        const titleId = `${id}-${category}-title`
        const descriptionId = `${id}-${category}-description`
        const vendors = vendorsListedUnder(declaredVendors, category)

        return (
          <div key={category} className="grid gap-3">
            <div className="flex items-start justify-between gap-4">
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
            {vendors.length > 0 && (
              <ConsentVendors category={category} vendors={vendors} />
            )}
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
