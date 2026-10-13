"use client"

import * as React from "react"
import {
  StreamedConsentSurface,
  useBannerCopy,
  useConsentLabels,
  useFocusTrap,
  useHeadlessConsentUI,
} from "c15t/react/headless"

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

function ConsentBannerContent({ className }: { className?: string }) {
  const { banner, openDialog, performAction } = useHeadlessConsentUI()
  const { title, description } = useBannerCopy()
  const labels = useConsentLabels()
  const ref = React.useRef<HTMLDivElement>(null)
  const titleId = React.useId()
  const descriptionId = React.useId()

  useFocusTrap(banner.isVisible && banner.blocking, ref)

  if (!banner.isVisible) return null

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
          "fixed inset-x-4 bottom-4 z-50 flex flex-col outline-none sm:inset-x-auto sm:start-4 sm:w-full sm:max-w-md",
          className
        )}
      >
        <ConsentBranding className="relative z-10 me-3 -mb-px self-end rounded-b-none border-b-0" />
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle id={titleId}>{title}</CardTitle>
            <CardDescription id={descriptionId}>{description}</CardDescription>
          </CardHeader>
          <CardFooter className="flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
            {banner.preferenceControls.map((control) => (
              <Button key={control} variant="link" onPress={openDialog}>
                {labels.preferenceControls[control]}
              </Button>
            ))}
            {banner.actionGroups.map((group) => (
              <div
                key={group.join("-")}
                className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
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
