"use client";

import CookieBanner from "@/registry/default/components/consent/cookie-banner";
import {
  ConsentManagerProvider,
  useConsentManager,
} from "@koroflow/core-react";
import { useEffect } from "react";

export default function PrivacyPopupMinimalDemo() {
  return (
    <ConsentManagerProvider
      initialGdprTypes={[
        "necessary",
        "marketing",
        "functionality",
        "measurement",
      ]}
      // This is just for the demo's so we can have multiple instances of the consent manager on the same page.
      namespace="callback-demo"
    >
      <ConsentCallbacks />
    </ConsentManagerProvider>
  );
}

function ConsentCallbacks() {
  const { setCallback } = useConsentManager();

  useEffect(() => {
    setCallback("onBannerShown", () => {
      console.log("Banner displayed");
    });

    setCallback("onConsentGiven", () => {
      console.log("User gave consent");
    });

    setCallback("onConsentRejected", () => {
      console.log("User rejected consent");
    });

    setCallback("onBannerClosed", () => {
      console.log("Banner closed");
    });
  }, [setCallback]);

  return <CookieBanner />;
}
