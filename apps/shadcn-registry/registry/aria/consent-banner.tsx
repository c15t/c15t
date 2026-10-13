"use client"

import * as React from "react"
import {
  useBannerCopy,
  useConsentLabels,
  useFocusTrap,
  useHeadlessConsentUI,
} from "c15t/react/headless"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function ConsentBanner({ className }: { className?: string }) {
  const { banner, openDialog, performAction } = useHeadlessConsentUI()
  const { title, description } = useBannerCopy()
  const labels = useConsentLabels()
  const cardRef = React.useRef<HTMLDivElement>(null)
  const titleId = React.useId()

  useFocusTrap(banner.isVisible && banner.blocking, cardRef)

  if (!banner.isVisible) return null

  return (
    <>
      {banner.blocking && <div className="fixed inset-0 z-50 bg-black/10" />}
      <Card
        ref={cardRef}
        tabIndex={-1}
        role={banner.blocking ? "dialog" : "region"}
        aria-modal={banner.blocking || undefined}
        aria-labelledby={titleId}
        className={cn(
          "fixed inset-x-4 bottom-4 z-50 outline-none sm:inset-x-auto sm:start-4 sm:w-full sm:max-w-md",
          className
        )}
      >
        <CardHeader>
          <CardTitle id={titleId}>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
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
    </>
  )
}
