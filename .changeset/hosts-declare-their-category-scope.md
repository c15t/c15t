---
"@c15t/react-native": minor
---

Let the host declare the consent categories its app offers, so a mobile app and a web app on the same backend and the same policy render the same category rows. The declaration reaches both cores where their launch hooks already build the snapshot, before the first JavaScript frame: the Expo config plugin takes `consentCategories`, spelled to the native projects as the `com.c15t.categories` `Info.plist` array and the comma-separated `com.c15t.CATEGORIES` manifest meta-data, and bare hosts write those keys directly. The declaration only narrows the optional half of the resolved policy scope, an unknown name is dropped rather than trusted, and declaring nothing still means the full scope, so an app that configured nothing keeps behaving exactly as before. Before this there was no Android reader for a scope at all and the plugin wrote neither key, so a mobile dialog could only list what the policy governs with no way to agree with the web `consentCategories` list beside it.

