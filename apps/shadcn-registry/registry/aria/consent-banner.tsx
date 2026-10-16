"use client"

import * as React from "react"
import {
  StreamedConsentSurface,
  useBannerCopy,
  useConsentLabels,
  useFocusTrap,
  useHeadlessConsentUI,
  useScrollLock,
} from "c15t/react/headless"
import type { HeadlessConsentBannerState } from "c15t/react/headless"

import { ConsentBranding } from "@/components/c15t/consent-branding"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

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
  const { banner, openDialog, performAction } = useHeadlessConsentUI()
  const { title, description } = useBannerCopy()
  const labels = useConsentLabels()
  const ref = React.useRef<HTMLDivElement>(null)
  const titleId = React.useId()
  const descriptionId = React.useId()

  // A blocking banner, such as a consent wall, holds focus and stops the
  // page scrolling until the visitor chooses.
  useFocusTrap(banner.isVisible && banner.blocking, ref)
  useScrollLock(banner.isVisible && banner.blocking)

  if (!banner.isVisible) return null

  // A column direction, or the strict and balanced profiles, stack the
  // actions at full width.
  const stacked = banner.direction === "column" || banner.shouldFillActions
  const bar = banner.variant === "bar"
  const topBar = bar && banner.position === "top"

  return (
    <>
      {banner.blocking && <div className="fixed inset-0 z-50 bg-black/10" />}
      <div
        ref={ref}
        tabIndex={-1}
        role={banner.blocking ? "dialog" : "region"}
        aria-modal={banner.blocking || undefined}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
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
            <CardTitle id={titleId}>{title}</CardTitle>
            <CardDescription id={descriptionId}>{description}</CardDescription>
          </CardHeader>
          <CardFooter
            className={cn(
              "flex-col items-stretch gap-2",
              bar && "rounded-none",
              !stacked && "sm:flex-row sm:flex-wrap sm:justify-between"
            )}
          >
            {banner.preferenceControls.map((control) => (
              <Button key={control} variant="link" onPress={openDialog}>
                {labels.preferenceControls[control]}
              </Button>
            ))}
            {banner.actionGroups.map((group) => (
              <div
                key={group.join("-")}
                className={cn(
                  "flex flex-col gap-2",
                  !stacked && "sm:flex-row sm:flex-wrap"
                )}
              >
                {group.map((action) => (
                  <Button
                    key={action}
                    variant={
                      banner.primaryActions.includes(action)
                        ? "default"
                        : "outline"
                    }
                    onPress={() => performAction(action)}
                  >
                    {labels.actions[action]}
                  </Button>
                ))}
              </div>
            ))}
          </CardFooter>
        </Card>
      </div>
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
