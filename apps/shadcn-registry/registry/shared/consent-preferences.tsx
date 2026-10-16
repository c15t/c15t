"use client"

import { useId } from "react"
import { ChevronDownIcon } from "lucide-react"
import type { AllConsentNames, PresentationAction } from "c15t/react"
import {
  useConsentDraft,
  useExplicitChoice,
  useRestrictions,
  useTranslations,
} from "c15t/react"
import {
  useConsentLabels,
  useHeadlessConsentUI,
  useVendorsListedUnder,
} from "c15t/react/headless"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

// The copy the stock dialog falls back to when the translations leave
// consentManagerDialog.vendors out.
const defaultVendorCopy = {
  disabledByCategory: "Turn on this category to choose vendors.",
  privacyPolicy: "Privacy policy",
  switchLabel: "Allow {vendor}",
  title: "Vendors ({count})",
}

/**
 * The vendors the stock dialog lists under one category, each with its own
 * switch. The switches stage grants on the same draft as the category
 * switches, so one save records both. They're disabled while the category is
 * off, since a vendor grant never turns its category on. Renders nothing when
 * the category lists no vendors.
 */
function ConsentVendors({ category }: { category: AllConsentNames }) {
  const vendors = useVendorsListedUnder(category)
  const id = useId()
  const draft = useConsentDraft()
  const { consentManagerDialog } = useTranslations()
  const copy = { ...defaultVendorCopy, ...consentManagerDialog.vendors }
  const categoryOn = draft.values[category] === true
  const title = copy.title.replace("{count}", String(vendors.length))

  if (vendors.length === 0) {
    return null
  }

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
                    checked={draft.vendors[vendor.id] ?? true}
                    disabled={!categoryOn}
                    onCheckedChange={(checked) =>
                      draft.setVendor(vendor.id, checked)
                    }
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
  const id = useId()
  const draft = useConsentDraft()
  const explicitChoice = useExplicitChoice()
  const restrictions = useRestrictions()
  const { consentTypes } = useTranslations()

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {draft.displayedCategories.map((category) => {
        const titleId = `${id}-${category}-title`
        const descriptionId = `${id}-${category}-description`
        const restrictionId = `${id}-${category}-restriction`
        const description = consentTypes[category]?.description
        // A privacy signal or the current policy overrides the saved grant,
        // so the category stays off while its switch shows the grant. An
        // unsaved toggle doesn't count.
        const restricted =
          category !== "necessary" &&
          explicitChoice?.categories[category]?.value === true &&
          (restrictions[category]?.length ?? 0) > 0
        const describedBy = [
          description && descriptionId,
          restricted && restrictionId,
        ]
          .filter(Boolean)
          .join(" ")

        return (
          <div key={category} className="grid gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-1 text-start">
                <span id={titleId} className="font-medium">
                  {consentTypes[category]?.title ?? category}
                </span>
                {description && (
                  <span id={descriptionId} className="text-muted-foreground">
                    {description}
                  </span>
                )}
              </div>
              <Switch
                aria-labelledby={titleId}
                aria-describedby={describedBy || undefined}
                checked={draft.values[category]}
                disabled={category === "necessary"}
                onCheckedChange={(checked) => draft.set(category, checked)}
              />
            </div>
            {restricted && (
              <output
                id={restrictionId}
                className="text-start text-xs text-muted-foreground"
              >
                Your saved choice is restricted by the current privacy
                settings.
              </output>
            )}
            <ConsentVendors category={category} />
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

  // A column direction, or the strict and balanced profiles, stack the
  // actions at full width.
  const stacked = dialog.direction === "column" || dialog.shouldFillActions

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        !stacked && "sm:flex-row sm:flex-wrap sm:justify-between",
        className
      )}
    >
      {dialog.actionGroups.map((group) => (
        <div
          key={group.join("-")}
          className={cn("flex flex-col gap-2", !stacked && "sm:flex-row")}
        >
          {group.map((action) => (
            <Button
              key={action}
              type="button"
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
