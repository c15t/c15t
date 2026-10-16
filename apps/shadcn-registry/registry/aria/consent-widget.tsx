"use client"

import { ConsentDraftProvider, useHasConsentUI } from "c15t/react"
import {
  useConsentTextDirection,
  useTranslations,
} from "c15t/react/headless"

import {
  ConsentPreferences,
  ConsentPreferencesActions,
} from "@/components/c15t/consent-preferences"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function ConsentWidget({ className }: { className?: string }) {
  const hasConsentUI = useHasConsentUI()
  const { consentManagerDialog } = useTranslations()
  const dir = useConsentTextDirection()

  if (!hasConsentUI) return null

  return (
    <ConsentDraftProvider>
      <Card dir={dir} className={className}>
        <CardHeader>
          <CardTitle>{consentManagerDialog.title}</CardTitle>
          <CardDescription>{consentManagerDialog.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ConsentPreferences />
        </CardContent>
        <CardFooter>
          <ConsentPreferencesActions className="w-full" />
        </CardFooter>
      </Card>
    </ConsentDraftProvider>
  )
}
