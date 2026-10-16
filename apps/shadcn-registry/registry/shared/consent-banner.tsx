"use client"

import { useId, useRef } from "react"
import {
  StreamedConsentSurface,
  useBannerCopy,
  useConsentLabels,
  useFocusTrap,
  useHeadlessConsentUI,
  useScrollLock,
} from "c15t/react/headless"
import type { HeadlessConsentBannerState } from "c15t/react/headless"

import { cn } from "@/lib/utils"
import { ConsentBranding } from "@/components/c15t/consent-branding"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * Where the banner sits, from `presentation.prompt.variant` and `position`.
 * A default corner follows the text direction and a corner the host chose
 * doesn't, as in the stock banner.
 */
function placementClassName({
  variant,
  position,
  positionSource,
}: HeadlessConsentBannerState) {
  if (variant === "wall") {
    return "top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2"
  }
  if (variant === "bar") {
    return cn("inset-x-0", position === "top" ? "top-0" : "bottom-0")
  }
  const edge = position.startsWith("top") ? "top-4" : "bottom-4"
  const width = variant === "widget" ? "sm:max-w-sm" : "sm:max-w-md"
  if (position.endsWith("-center")) {
    return cn(edge, width, "inset-x-4 mx-auto sm:w-full")
  }
  const left = position.endsWith("-left")
  if (positionSource === "host") {
    return cn(
      edge,
      width,
      "right-4 left-4 sm:w-full",
      left ? "sm:right-auto" : "sm:left-auto"
    )
  }
  return cn(
    edge,
    width,
    "start-4 end-4 sm:w-full",
    left ? "sm:end-auto" : "sm:start-auto"
  )
}

function ConsentBannerContent({ className }: { className?: string }) {
  const id = useId()
  const ref = useRef<HTMLElement>(null)
  const { banner, openDialog, performAction } = useHeadlessConsentUI()
  const { title, description } = useBannerCopy()
  const labels = useConsentLabels()

  // A blocking banner, such as a consent wall, holds focus and stops the
  // page scrolling until the visitor chooses.
  useFocusTrap(banner.isVisible && banner.blocking, ref)
  useScrollLock(banner.isVisible && banner.blocking)

  if (!banner.isVisible) {
    return null
  }

  // A column direction, or the strict and balanced profiles, stack the
  // actions at full width.
  const stacked = banner.direction === "column" || banner.shouldFillActions
  const bar = banner.variant === "bar"
  const topBar = bar && banner.position === "top"

  return (
    <>
      {banner.blocking && <div className="fixed inset-0 z-50 bg-black/10" />}
      <section
        ref={ref}
        tabIndex={-1}
        role={banner.blocking ? "dialog" : "region"}
        aria-modal={banner.blocking || undefined}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        className={cn(
          "fixed z-50 flex flex-col outline-none",
          placementClassName(banner),
          className
        )}
      >
        {/* The tag sits on the card's edge that faces the page. */}
        <ConsentBranding
          className={cn(
            "relative z-10 self-end",
            bar ? "me-6" : "me-3",
            topBar
              ? "order-last -mt-px rounded-t-none border-t-0"
              : "-mb-px rounded-b-none border-b-0"
          )}
        />
        <Card
          size={banner.variant === "widget" ? "sm" : "default"}
          className={cn("shadow-lg", bar && "rounded-none")}
        >
          <CardHeader>
            <CardTitle id={`${id}-title`}>{title}</CardTitle>
            <CardDescription id={`${id}-description`}>
              {description}
            </CardDescription>
          </CardHeader>
          <CardFooter
            className={cn(
              "gap-2",
              bar && "rounded-none",
              stacked ? "flex-col items-stretch" : "flex-wrap justify-between"
            )}
          >
            {banner.preferenceControls.map((right) => (
              <Button
                key={right}
                type="button"
                variant="link"
                onClick={openDialog}
              >
                {labels.preferenceControls[right]}
              </Button>
            ))}
            {banner.actionGroups.map((group) => (
              <div
                key={group.join("-")}
                className={cn("flex gap-2", stacked ? "flex-col" : "flex-wrap")}
              >
                {group.map((action) => (
                  <Button
                    key={action}
                    type="button"
                    variant={
                      banner.primaryActions.includes(action)
                        ? "default"
                        : "outline"
                    }
                    onClick={() => performAction(action)}
                  >
                    {labels.actions[action]}
                  </Button>
                ))}
              </div>
            ))}
          </CardFooter>
        </Card>
      </section>
    </>
  )
}

export function ConsentBanner({ className }: { className?: string }) {
  // On a streamed server render, the banner is sent with the consent state
  // instead of waiting for hydration.
  return (
    <StreamedConsentSurface>
      <ConsentBannerContent className={className} />
    </StreamedConsentSurface>
  )
}
