"use client"

import {
  ConsentDraftProvider,
  useHasConsentUI,
  useTranslations,
} from "c15t/react"
import { useConsentTextDirection } from "c15t/react/headless"

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

  // Regions with no consent requirement have nothing to manage.
  if (!hasConsentUI) {
    return null
  }

  return (
    <Card dir={dir} className={className}>
      <ConsentDraftProvider>
        <CardHeader>
          <CardTitle>{consentManagerDialog.title}</CardTitle>
          <CardDescription>{consentManagerDialog.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ConsentPreferences />
        </CardContent>
        <CardFooter>
          <ConsentPreferencesActions className="flex-1" />
        </CardFooter>
      </ConsentDraftProvider>
    </Card>
  )
}
