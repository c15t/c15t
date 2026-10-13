"use client"

import { useId, useRef } from "react"
import {
  StreamedConsentSurface,
  useBannerCopy,
  useConsentLabels,
  useFocusTrap,
  useHeadlessConsentUI,
} from "c15t/react/headless"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function ConsentBannerContent({ className }: { className?: string }) {
  const id = useId()
  const ref = useRef<HTMLElement>(null)
  const { banner, openDialog, performAction } = useHeadlessConsentUI()
  const { title, description } = useBannerCopy()
  const labels = useConsentLabels()

  // A blocking banner, such as a consent wall, holds focus until the
  // visitor chooses.
  useFocusTrap(banner.isVisible && banner.blocking, ref)

  if (!banner.isVisible) {
    return null
  }

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
          "fixed start-4 end-4 bottom-4 z-50 outline-none sm:end-auto sm:w-full sm:max-w-md",
          className
        )}
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle id={`${id}-title`}>{title}</CardTitle>
            <CardDescription id={`${id}-description`}>
              {description}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex-wrap justify-between gap-2">
            {banner.preferenceControls.map((right) => (
              <Button key={right} variant="link" onClick={openDialog}>
                {labels.preferenceControls[right]}
              </Button>
            ))}
            {banner.actionGroups.map((group) => (
              <div key={group.join("-")} className="flex flex-wrap gap-2">
                {group.map((action) => (
                  <Button
                    key={action}
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
