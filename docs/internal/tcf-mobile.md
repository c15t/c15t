---
title: TCF on mobile
description: Ground truth for IAB TCF in native mobile apps: the IABTCF_ storage bus, byte-exact TC String encoding, v2.0/v2.2/v2.3 deltas, in-app rendering duties, and the requirements our native cores fail today.
---

Internal spec research. Not published on c15t.com. Written 2026-09-18 against branch
`KayleeWilliams/tcf-mobile-spec`, which is based off `v3-3`, not `canary`. Code changes
are out of scope: this document establishes what the specs require and what that means
for `native/core-swift`, `native/core-android`, and `packages/iab`. It is a companion to
[tcf-readiness.md](/docs/internal/tcf-readiness.md),
which covers the web side and the CMP-ID registration question. Nothing here re-decides
that question.

## How to read this

Every claim carries a source. Because two of the sources disagree with each other and one
of them is our dependency rather than a document, each line is tagged by layer:

- **[spec]** — the IAB text itself, with section name.
- **[encoder 1.5.21]** — observed in `@iabtechlabtcf/core@1.5.21`, the reference codec
  vendored in this worktree at `packages/iab/package.json:63`. Behaviour, not prose.
- **[ecosystem]** — a third-party SDK or adapter that reads or writes the thing, cited to
  a repo path. This is evidence about readers, not about obligations.
- **[unverified]** — no source found. These live only in
  [Unverified](#9-unverified-and-could-not-read) and are never load-bearing.

Where the record is genuinely silent, this document says so in those words.

## Sources read

All fetched 2026-09-18. Section names are the document's own headings.

| # | Document | State |
| --- | --- | --- |
| S1 | IAB Tech Lab — Consent Management Platform API, `TCFv2/IAB Tech Lab - CMP API v2.md`. Header "Final v.2.2 May 2023"; version history runs to "February 2026 \| 2.2" | [github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/TCFv2/IAB%20Tech%20Lab%20-%20CMP%20API%20v2.md](https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/TCFv2/IAB%20Tech%20Lab%20-%20CMP%20API%20v2.md) |
| S2 | IAB Tech Lab — Transparency and Consent String with Global Vendor & CMP List Formats, `TCFv2/IAB Tech Lab - Consent string and vendor list formats v2.md`. Header "Final v.2.2 May 2023"; version history rows "Apr 2025 \| 2.3" and "May 2026 \| 2.4" | [same folder](https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/TCFv2/IAB%20Tech%20Lab%20-%20Consent%20string%20and%20vendor%20list%20formats%20v2.md) |
| S3 | Mobile In-App Consent APIs v1.0 Final.md (TCF v1 era, repo root) | [link](https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/Mobile%20In-App%20Consent%20APIs%20v1.0%20Final.md) |
| S4 | TCF Implementation Guidelines, `TCFv2/TCF-Implementation-Guidelines.md` | [link](https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/TCFv2/TCF-Implementation-Guidelines.md) |
| S5 | IAB Europe TCF **Policies**, version string `2026-05-29.5.0.b`, 79 pages | [iabeurope.eu/wp-content/uploads/TCF-Policies-TransparencyConsentFramework_Policies_Version-2026-05-29.5.0.b.docx.pdf](http://iabeurope.eu/wp-content/uploads/TCF-Policies-TransparencyConsentFramework_Policies_Version-2026-05-29.5.0.b.docx.pdf) |
| S6 | IAB Europe, "All You Need to Know About the Transition to TCF v2.3" | [iabeurope.eu/all-you-need-to-know-about-the-transition-to-tcf-v2-3/](https://iabeurope.eu/all-you-need-to-know-about-the-transition-to-tcf-v2-3/) |
| S7 | GPP section spec, "GPPExtension: IAB Europe TCF.md", § Key Names | [link](https://github.com/InteractiveAdvertisingBureau/Global-Privacy-Platform/blob/main/Sections/EEA/GPPExtension%3A%20IAB%20Europe%20TCF.md) |
| S8 | Live Global Vendor List | [vendor-list.consensu.org/v3/vendor-list.json](https://vendor-list.consensu.org/v3/vendor-list.json) |
| S9 | `@iabtechlabtcf/core@1.5.21`, installed in this worktree | `node_modules/.bun/@iabtechlabtcf+core@1.5.21/` |
| S10 | Apple, `UserDefaults` documentation (structured docs JSON) | [developer.apple.com/documentation/foundation/userdefaults](https://developer.apple.com/documentation/foundation/userdefaults) |
| S11 | Android, `android.preference.PreferenceManager` reference | [developer.android.com/reference/android/preference/PreferenceManager](https://developer.android.com/reference/android/preference/PreferenceManager) |

## Two corrections to the brief

**The v1 mobile document does not name any `IABTCF_` key.** `grep -c IABTCF` on S3 returns
`0`. S3 is the origin of the storage *bus* — NSUserDefaults on iOS, application-default
SharedPreferences on Android, pre-parsed purpose and vendor keys, and
`NSUserDefaultsDidChangeNotification` / `OnSharedPreferenceChangeListener` — but the key
names it uses are `IABConsent_*`. The `IABTCF_*` table comes from S1, section "What is the
CMP in-app internal structure for the defined API?". That is the table this document
derives.

**There is no separate v2.3 or v2.4 format document on GitHub.** `TCFv2/` contains exactly
six files (GitHub contents API, 2026-09-18): Additional Vendor Information List
Specification, CMP API v2, Consent string and vendor list formats v2, Device storage
duration and access disclosure, TCF-Implementation-Guidelines, and Vendor Device Storage &
Operational Disclosures. The repo root has `TCFv2/` plus the v1 files and no `TCFv2.3`. The
current text, including the v2.3 mandatory-Disclosed-Vendors change, lives inside the
single S2 file, which carries its own version history up to spec version 2.4. I did not
find a separate v2.3 document on the IAB Tech Lab site: both
`iabtechlab.com/standards/transparency-and-consent-framework/` and
`iabtechlab.com/technical-documentation-transparency-consent-framework/` returned 404 to
this machine. If one exists behind the portal, it is in
[Could not read](#9-unverified-and-could-not-read).

## 1. The `IABTCF_` storage bus

### 1.1 Why a mobile CMP is obliged to write it

Integration steps, S1 "How is a CMP used in-app?": the publisher embeds a CMP SDK,
initialises exactly one of them, and "The initialized CMP **shall** set `IABTCF_CmpSdkID`
with its ID as soon as it is initialized in the app to signal to vendors that a CMP is
present"; "The CMP **shall** set the `NSUserDefaults`(iOS) or `SharedPreferences`(Android)
variables and vendors will then be able to read from them directly"; "Vendors **should**
listen to `IABTCF_*` key updates". S1 "What is the CMP in-app internal structure for the
defined API?" repeats it: those two stores "**shall** be used to store pre-parsed TC data
as well as the TC string by a CMP SDK", so that vendors avoid duplicating a decoder and so
TC data is "portable between CMPs". [spec]

The obligation to support the whole of that text comes from S5 Chapter II (Policies for
CMPs) §4.1: "a CMP must support the full Specifications, unless the Specifications expressly
state that a feature is optional, in which case a CMP may choose to implement the optional
feature but need not to do so." The mobile key table states no optionality. A private CMP
implements only "to the extent necessary to support the needs of the Vendors, Purposes, and
Special Features selected by its Publisher owner" (S5 Chapter II §4.2), which is the escape
hatch a single-publisher deployment has and a platform CMP does not.

One consequence worth stating before any code exists: S5 Chapter II §4.4 says a CMP "must
not read, write, or communicate any Vendor's Legal Bases except according to and as
provided for under the Specifications." Vendor legal bases are not a free-form field we may
persist in our own envelope and serve from our own API. [spec]

S1 also puts the cleanup duty on the publisher: "If a publisher chooses to remove a CMP SDK
from their app they are responsible for clearing all `IABTCF_*` vestigial values for users
so that vendors do not continue to use the TC data therein." Our `reset()` inherits that
duty for the keys we write. [spec]

### 1.2 The key table

Nineteen distinct keys. Counts, recomputed on this machine:

```console
$ grep -c IABTCF IAB_Tech_Lab_-_CMP_API_v2.md
35                                   # lines containing the string
$ grep -o "IABTCF_[A-Za-z{}]*" IAB_Tech_Lab_-_CMP_API_v2.md | wc -l
38                                   # total occurrences
$ grep -o "IABTCF_[A-Za-z{}]*" IAB_Tech_Lab_-_CMP_API_v2.md | sort -u | wc -l
20                                   # 19 keys + 2 bare "IABTCF_*" glob mentions
```

Column "Store" is the type S1 gives. "Pre-parsed" means a vendor can answer a yes/no without
decoding the string; the value is still a string of `0`/`1` characters, indexed from 0 at
vendor or purpose ID 1. "Reader" cites the strongest thing I could actually fetch.

| Key | Store | Raw or pre-parsed | Reader, with evidence | Layer |
| --- | --- | --- | --- | --- |
| `IABTCF_CmpSdkID` | `Number`, unsigned int | Pre-parsed scalar | Google Mobile Ads consent-key collection list extracted from a device firmware mirror (`shift/sun50iw12p1-research` `firmware/fex_files/all_sections.txt`); Prebid Mobile iOS demo `IABConsentSettingKey.swift` | [spec] + [ecosystem] |
| `IABTCF_CmpSdkVersion` | `Number`, unsigned int | Pre-parsed scalar | No reader found in this pass. Enumerated by Ethyca `janus-sdk-flutter` `example/lib/screens/iabtcf_screen.dart` | [spec] + [ecosystem] |
| `IABTCF_PolicyVersion` | `Number`, unsigned int | Pre-parsed scalar | Google Mobile Ads collection list, same firmware artifact as above | [spec] + [ecosystem] |
| `IABTCF_gdprApplies` | `Number`: `1` applies, `0` does not, **unset** = undetermined | Pre-parsed scalar | Google mediation adapters, e.g. `googleads-mobile-ios-mediation` `adapters/Unity/UnityAdapter/GADMAdapterUnityUtils.m`; AppNexus `mobile-sdk-android` `ANGDPRSettings.java`; Prebid Mobile iOS `TargetingObjCTests.m`. S1 names it as what mediation SDKs read | [spec] + [ecosystem] |
| `IABTCF_PublisherCC` | `String`, ISO 3166-1 alpha-2, default `AA` | Pre-parsed scalar | No reader found. Enumerated by Ethyca Flutter example | [spec] + [ecosystem] |
| `IABTCF_PurposeOneTreatment` | `Number`: `0` none, `1` purpose 1 not disclosed; unset default `0` | Pre-parsed scalar | No reader found. Enumerated by Ethyca Flutter example | [spec] + [ecosystem] |
| `IABTCF_UseNonStandardTexts` | `Number`: `1` customised stack text or illustrations | Pre-parsed scalar | No reader under this exact name. Under the sibling name `IABTCF_UseNonStandardStacks`: `irov/Mengine` `iOSTransparencyConsentParam.mm`. See [Where sources disagree](#8-where-sources-disagree) | [spec] + [ecosystem] |
| `IABTCF_TCString` | `String`, full encoded TC string | **Raw string** | The one key with universal readers. AppLovin MAX Fyber adapters (Android changelog "stores the consent string in SharedPreferences via the `IABTCF_TCString` key", iOS changelog "in User Defaults"); Dailymotion `player-sdk-android` `TCF2Handler.kt`; Google `react-native-google-mobile-ads` `NativeConsentModule.ts`; Prebid Mobile iOS; AppNexus both platforms | [spec] + [ecosystem] |
| `IABTCF_VendorConsents` | Binary string, index `n` = vendor `n+1` | Pre-parsed | `irov/Mengine` `iOSTransparencyConsentParam.mm` | [spec] + [ecosystem] |
| `IABTCF_VendorLegitimateInterests` | Binary string, index `n` = vendor `n+1` | Pre-parsed | No reader found. Written by RingPublishing `GDPRStorage.swift` / `Storage.java` | [spec] + [ecosystem] |
| `IABTCF_DisclosedVendors` | Binary string, index `n` = vendor `n+1` | Pre-parsed | Written by RingPublishing `GDPRStorage.swift` (changelog 1.9.0, 2025-01-16: "Added TCF 2.3 support for vendor.vendorsDisclosed — stored under IABTCF_DisclosedVendors key in UserDefaults"). **No ad-network reader found.** S6 directs vendors to the bit inside the string, not this key | [spec] + [ecosystem] |
| `IABTCF_PurposeConsents` | Binary string, index `n` = purpose `n+1` | Pre-parsed | AppNexus `ANGDPRSettings.java` and iOS `ANGDPRSettings.m`; Prebid Mobile iOS; cordova admob plugin `emiAdmobPlugin.m`; Google Mobile Ads collection list in the firmware mirror | [spec] + [ecosystem] |
| `IABTCF_PurposeLegitimateInterests` | Binary string, index `n` = purpose `n+1` | Pre-parsed | No reader found. Enumerated by Ethyca Flutter example | [spec] + [ecosystem] |
| `IABTCF_SpecialFeaturesOptIns` | Binary string, index `n` = special feature `n+1` | Pre-parsed | No reader found. Enumerated by Ethyca Flutter example; written by RingPublishing `Storage.java` | [spec] + [ecosystem] |
| `IABTCF_PublisherRestrictions{ID}` | String of `0`/`1`/`2`, index `n` = vendor `n+1`; `{ID}` is the purpose ID | Pre-parsed, 3 states not 2 | No reader found. Enumerated by Ethyca Flutter example and S7 | [spec] + [ecosystem] |
| `IABTCF_PublisherConsent` | Binary string, purpose `n+1`, publisher's own consent | Pre-parsed | No reader found. Enumerated by Ethyca Flutter example; mapped in S7 | [spec] + [ecosystem] |
| `IABTCF_PublisherLegitimateInterests` | Binary string, purpose `n+1` | Pre-parsed | No reader found. Enumerated by Ethyca Flutter example; mapped in S7 | [spec] + [ecosystem] |
| `IABTCF_PublisherCustomPurposesConsents` | Binary string, custom purpose `n+1` | Pre-parsed | No reader found. Enumerated by Ethyca Flutter example; mapped in S7 | [spec] + [ecosystem] |
| `IABTCF_PublisherCustomPurposesLegitimateInterests` | Binary string, custom purpose `n+1` | Pre-parsed | No reader found. Enumerated by Ethyca Flutter example; mapped in S7 | [spec] + [ecosystem] |

"No reader found" is the limit of my search, not a claim that nobody reads the key. The
search was GitHub code search for the exact key name, run from this session; the commands are
in [Reproducing the checks](#10-reproducing-the-checks).

S1 also documents the same shape for the in-app JS bridge: the `InAppTCData` object exposes
`purpose.consents`, `vendor.consents`, `specialFeatureOptins`,
`publisher.customPurpose.*` and `publisher.restrictions['[purpose id]']` as the same
bit-strings, so a CTV or hybrid surface that speaks `getInAppTCData` returns what the store
holds. [spec]

### 1.3 The deprecated `IABConsent_*` names

S3 "What are the values..." defines five, and it is the origin of the bus itself:

| Key (S3) | Type | Still read? |
| --- | --- | --- |
| `IABConsent_CMPPresent` | Boolean, set as soon as the CMP loads | Yes. Prebid Mobile iOS `IABConsentSettingKey.swift` (v1 enum) and `tools/CMPReference/.../CMPStorage.m`; Google Mobile Ads collection list in the firmware mirror |
| `IABConsent_SubjectToGDPR` | `1`/`0` | Yes. Same two sources |
| `IABConsent_ConsentString` | v1 consent string | Yes. Same two sources; Prebid `TargetingObjCTests.m` clears it alongside `IABTCF_TCString` |
| `IABConsent_ParsedPurposeConsents` | bit string | Yes, in the Google Mobile Ads collection list only |
| `IABConsent_ParsedVendorConsents` | bit string | Yes, in the Google Mobile Ads collection list only |

S3 also names `IABConsent_CMPURLPresent` in Prebid's `CMPStorage.m`, which I cannot find in
S3's table. Treat it as a Prebid-local name. [ecosystem]

The v1/v2 overlap is not hypothetical. S2 "Managing conflicting string versions": "If a CMP
encounters a situation where both a v1.x string and a v2.0 string are erroneously present
simultaneously, the CMP should remove the v1.x string to ensure that there is only one source
of truth." A mobile implementation that writes `IABTCF_*` into an app where a v1 CMP already
ran inherits that cleanup duty. [spec]

My recommendation, stated plainly so nobody has to re-derive it: **write the `IABTCF_*` bus in
the platform-standard location, and keep the Keychain and the AndroidKeyStore-backed store as
the authoritative c15t copy.** Do not move the existing store. The reasoning and the exact
files are in the next section.

### 1.4 Keys that are in the wild but not in S1's table

These are real keys that ad code looks for. None of them is an IAB-defined `IABTCF_*` key
except where noted, so they belong in an compatibility layer, not in the table above.

- `IABTCF_AddtlConsent` — Google's Additional Consent string. Read by Google's own first-party
  mediation adapters: `googleads-mobile-ios-mediation` `adapters/Unity/.../GADMAdapterUnityUtils.m`
  and `adapters/MyTarget/.../GADMAdapterMyTargetUtils.m`, which log "The IABTCF_AddtlConsent
  string uses version 1 of Google's Additional Consent spec. Version 1 does not report vendors
  to whom the user denied consent." Also in the Google Mobile Ads collection list in the
  firmware mirror. **Not in S1's key table.** [ecosystem]
- `IABTCF_UseNonStandardStacks` — what `irov/Mengine` reads. It is S7's TCF key name, not
  S1's; see [Where sources disagree](#8-where-sources-disagree). [ecosystem]
- `IABUSPrivacy_String` — the USP/CCA string, a different framework. Present in the Google
  Mobile Ads collection list. Out of scope here; it belongs in the GPP/USP work. [ecosystem]
- `IABTCF_EnableAdvertiserConsentMode` — appears only in a demo target inside a CMP vendor's
  example app (`SourcePointUSA/ios-cmp-app` `Example/SourcepointFirebaseDemo/ViewController.swift`).
  Thin evidence; it is here so the next person does not mistake it for a spec key.
  [unverified] — do not implement on this evidence.

### 1.5 What GPP wants on the same device

S7 §Key Names states "In the mobile or CTV context, the key names to be used in GPP are listed
below" and gives an 18-row map from each `IABTCF_*` key to an `IABGPP_TCFEU2_*` twin
(`IABTCF_TCString` → `IABGPP_2_TCString`, everything else → the same suffix under
`IABGPP_TCFEU2_`). S1's CTV "Native" section tells CTV apps to support both naming schemes.
For phone and tablet apps S1's in-app table is the contract; the GPP twins matter if we ever
ship CTV. [spec]

## 2. Where the bus lives, per platform

### 2.1 Android: the application-default SharedPreferences

S1 "How do third-party SDKs (vendors) access the consent information in-app?": "On Android OS,
the TC data and TC string **shall** be stored in the default Shared Preferences for the
application context. This can be accessed using the `getDefaultSharedPreferences` method from
the `android.preference.PreferenceManager` class using the application context", with the
sample `PreferenceManager.getDefaultSharedPreferences(mContext)` and reads via `getString`
and `getInt` only. S3 says the same in v1 words. [spec]

`android.preference.PreferenceManager` has been deprecated since API 29 and S1 still names it,
so the interop contract is the *API call*, not the file. Android's reference page confirms
`getDefaultSharedPreferences(Context)` and `getDefaultSharedPreferencesName(Context)` ("Returns
the name used for storing default shared preferences", added API 24, deprecated API 29) but the
page text I fetched does not print the literal file name, so this document does not assert one.
**Write through `getDefaultSharedPreferences(context)`, the same call vendors read, and never
derive a file name.** [spec] for the call; the file name is not verified here.

This is where our current Android core is wrong for TCF specifically. `C15tStores.kt` builds:

- primary: `EncryptedFileStore(File(appContext.noBackupFilesDir, StorePaths.DIRECTORY))`, an
  AES-GCM file store keyed by AndroidKeyStore (`KeystoreKeyProvider`, `AesGcmCodec`);
- fallback: `getSharedPreferences("c15t.consent.fallback", Context.MODE_PRIVATE)`;
- subject id: `getSharedPreferences("c15t.subject", Context.MODE_PRIVATE)`.

None of those three is the application-default file, so a vendor doing exactly what S1 says
reads an empty store and concludes no CMP is present. The fallback line even logs "AndroidKeyStore
unavailable, storing consent unencrypted in SharedPreferences" — into *our* named file, which
still nobody else can find.

### 2.2 iOS: standard NSUserDefaults, and whether an app group is required

S1 names `NSUserDefaults` and links Apple's standard-defaults documentation. It never mentions
an app group, a suite name, or a shared container. I grepped all four IAB markdown files for
`app group`, `suiteName`, `suite name`, and `container`: the only hit is an unrelated sentence
about tag-management containers. **The TCF record is genuinely silent on app groups and suite
names.** Do not let anyone fill that gap with an inference in either direction.

The platform facts that settle the engineering question:

- Apple, `UserDefaults`: "you can create a `[UserDefaults]` object that reads and writes settings
  your app shares with an app extension", the app-group domain "is absent by default, but you can
  add a suite using the `[suiteName]` initializer", and "A sandboxed app cannot access or modify
  the settings of another app or process, with the following exceptions: An app can modify
  settings for one of its app extensions. An app can modify settings for an app group to which it
  belongs." [S10]
- Apple also states: "When you write values to a `[UserDefaults]` object, the object updates its
  in-memory version of that information right away, and writes the value to disk asynchronously",
  and "When someone backs up their device, the system includes any persistent defaults databases
  in the backup data." [S10]

Read together: an ad SDK shipped as a CocoaPod, SPM library, or xcframework is code inside the
host app's own process and sandbox, so **standard `UserDefaults.standard` is already the shared
place and no suite name is needed**. A suite name becomes necessary only when the reader is out
of process — an app extension, a network-extension content filter, a companion widget, or a
separate app. The specs do not contemplate those, and no source I read requires a suite. One
caveat I did not resolve: S1's `NSUserDefaults` link is an anchor deep-link
(`nsuserdefaults#1656615`-era) rather than a spelled property name, so "standard" is my reading
of the linked Apple page plus S1's own example, not a literal quote from S1.

### 2.3 The Keychain decision, and the security trade-off we owe the reader

Our iOS core today: `KeychainStore(service: "com.c15t.core")` writing generic-password items
(`kSecClassGenericPassword`, `kSecAttrService` = service, `kSecAttrAccount` = key) under
`com.c15t.subject`, `com.c15t.snapshot`, `com.c15t.pending`
(`core-swift/Sources/C15tCore/ConsentStore.swift:184-250`). `native/CONTRACT.md:284` states
iOS "writes the snapshot envelope plus the consent records to the Keychain", and
`native/CONTRACT.md:32` keeps Keychain use inside the store conformances. `native/CONTRACT.md:7-8`
puts TCF entirely out of scope: "No TC string, no GVL state, no `IABTCF_*` keys."

A generic-password Keychain item is readable only by code holding the same keychain access
group. Third-party ad SDKs are linked into the host binary and share the app's default access
group, so a vendor SDK *could* in principle read an item we wrote under the app's own
provisioning — but only if it knows the service and account strings and links `Security.framework`
against them, which no TCF-compliant vendor does because S1 tells them to read `NSUserDefaults`.
So as a matter of interop the Keychain is invisible to the ecosystem. **Consent has to leave the
Keychain for the bus to work.** It does not have to stop living there.

The trade-off, in the plainest available terms: Apple says of the defaults system "Don't store
personal or sensitive information as settings. The defaults system stores information on disk in
an unencrypted format. Store personal or sensitive information in the person's Keychain
instead." [S10] A TC String is personal data about an identifiable device user — consent
choices, the publisher's country code, a creation timestamp — and we would be writing it to
plaintext on disk because an advertising standard says so. Two things make that acceptable
rather than negligent, and both belong in the shipped docs:

1. The plaintext copy is a *signal*, not the record. `IABTCF_TCString` is derivable, and we keep
   writing the authoritative snapshot, the subject id, and the audit trail to the Keychain, so a
   tampered or missing defaults entry cannot become "the" consent state. S5 Chapter II §4.4 is
   the rule that makes this necessary: legal bases may only be communicated as the Specifications
   provide for, which is the bus — but nothing requires the bus to be our only copy.
2. Do not put anything on the bus that is not required there. Our subject id, policy claims,
   consent records, and pending-save queue stay in the Keychain. If we ever need them there we
   will have had the conversation, not inherited it.

Consequences to design for, both of them real:

- **Backup asymmetry.** Defaults databases are included in device backup [S10], so the bus
  travels with an iTunes/iCloud restore. Our Android primary store deliberately sits in
  `noBackupFilesDir`, so the c15t record does not travel. On a restored device a vendor can see
  a TC String that c15t has no matching record for. The safe resolution is the one the contract
  already uses: with no stored envelope the core serves `ready: false, policyPending: true` and
  every optional category denied (`native/CONTRACT.md:292-293`), and it must not accept the bus
  as proof of anything.
- **iOS survives uninstall.** `native/CONTRACT.md:566`: "iOS keeps the Keychain through an
  uninstall, so a reinstall is not a fresh install". If we write the bus, `reset()` and an
  uninstall-plus-reinstall must clear `UserDefaults.standard` too, or a reinstall resurrects an
  "already asked" signal the subject can no longer reach. That is also exactly the vestigial-value
  duty S1 assigns to whoever shipped the CMP.

### 2.4 What to match, not invent

The instruction that matters for whoever builds this: **do not create a second consent store.**
There is one, it is the Keychain on iOS and the `EncryptedFileStore` under `noBackupFilesDir` on
Android, and it stays authoritative. The IAB bus is an *egress* projection of that state, written
by the same store layer that already owns `com.c15t.snapshot`, so a mutation writes the snapshot
and refreshes the bus in one committed step. `native/CONTRACT.md` rule 1 ("Native owns consent
state. There is no second consent kernel in JavaScript") and rule 3 ("no Keychain outside the
store conformances") both survive that shape; a JS-side writer or a second store would break them.
The bus keys are a projection, so they are rebuildable from the snapshot at any time, and a
rebuild-after-wipe test is the cheapest guard against drift.

On Android this does mean a third preferences location exists — the application-default file —
because the spec requires a file we do not control. That is the standard's requirement, not a
c15t design choice, and it is the one place where "match the existing storage" and "satisfy the
spec" cannot both be literal. The fix is not to move the encrypted store.

## 3. The TC String, byte-exactly

All field names, widths, and value rules in this section are S2, section "TC String Format",
unless tagged otherwise. Fields are "stored in big-endian format. Bit numberings are
left-to-right." [spec]

### 3.1 Framing

There are three segments joined on a `.` character: the core string, Disclosed Vendors, and
Publisher TC. "A TC String must contain a Core TC String and the Disclosed Vendors segment. It
may optionally contain a Publisher TC segment." The core comes first; "All subsequent segments
(disclosedVendors and PublisherTC) may appear in any order because each includes a segment ID
used for identification." S2 example, reproduced because it is the only worked example in the
document:

```text
CQSbk4AQSbk4ANwAAAENAwCgAAAAAAAAAAYgACPAAAAA.IDKQA4AAgAKAGQAygAAA.YAAAAAAAAAAA
```

S2's "Full TC String passing" table describes the transported value as a "URL-safe base64-encoded
Transparency & Consent string". The per-segment encoding rule is not spelled out in prose; it is
observable in the reference codec:

```console
$ sed -n '1,45p' .../@iabtechlabtcf/core/lib/mjs/encoder/Base64Url.js
static DICT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
static BASIS = 6;   // log2(64)
static LCM  = 24;   // lcm(6, 8)
```

[encoder 1.5.21] So: build the segment as a string of `0`/`1` characters; pad the **right** end
with zeros up to the next multiple of 24 bits; emit one alphabet character per 6 bits, `+`→`-`,
`/`→`_`; emit **no** `=` padding; join segments with `.`. Every non-core segment is prefixed with
its 3-bit segment ID by `SegmentEncoder.encode` before its fields. A decoder must reject any
character outside `[A-Za-z0-9\-_]`. [encoder 1.5.21]

### 3.2 Core segment, in order

The fixed prefix is **213 bits** (sum of the widths below), then the three variable sections.

| # | Field | Bits | Rule |
| --- | --- | --- | --- |
| 1 | Version | 6 | "the value is 2 for this format" |
| 2 | Created | 36 | See 3.2.1 |
| 3 | LastUpdated | 36 | See 3.2.1 |
| 4 | CmpId | 12 | IAB Europe-assigned CMP ID |
| 5 | CmpVersion | 12 | CMP's own version, incremented per release |
| 6 | ConsentScreen | 6 | CMP-internal screen number, CmpVersion-specific |
| 7 | ConsentLanguage | 12 | Two ISO 639-1 letters, "Each letter is encoded as 6 bits, a=0..z=25" |
| 8 | VendorListVersion | 12 | GVL `vendorListVersion` used to obtain consent |
| 9 | TcfPolicyVersion | 6 | GVL `tcfPolicyVersion` used |
| 10 | IsServiceSpecific | 1 | "This field must always have the value of 1. When a Vendor encounters a TC String with IsServiceSpecific=0 then it is considered invalid." |
| 11 | UseNonStandardTexts | 1 | 1 = customised Stack descriptions and/or illustrations |
| 12 | SpecialFeatureOptIns | 12 | One bit per special feature, purpose ID `n+1` at index `n` |
| 13 | PurposesConsent | 24 | One bit per purpose on the consent basis (renamed from PurposesAllowed) |
| 14 | PurposesLITransparency | 24 | One bit per purpose on the legitimate-interest basis, 0 if the user objected |
| 15 | PurposeOneTreatment | 1 | 0 = disclosed normally as consent; 1 = not disclosed, see S2 "What if consent is governed differently in a country?" |
| 16 | PublisherCC | 12 | ISO 3166-1 alpha-2 country of the publisher's establishment |

**3.2.1 Created and LastUpdated.** Both 36 bits, both "Epoch time format when TC String was last
updated (must be updated any time a value is changed)". S2 "What happened to Created and
LastUpdated?" then changes the semantics: the fields "have been updated to have the **same
value** corresponding to the **day-level timestamp** of when the TC String was last updated",
with the in-table recipe `Math.round(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(),
new Date().getUTCDate())/100)` and "the timestamp must be based in UTC time in order to get a
consistent decisecond value across the time zones." Write both fields identically at day
resolution. [spec]

### 3.3 Vendor Consent and Vendor Legitimate Interest sections

Identical structure, twice, in this order:

| Field | Bits | Rule |
| --- | --- | --- |
| MaxVendorId | 16 | Highest vendor ID represented; lets a decoder find the end of the section |
| IsRangeEncoding | 1 | 1 = Range section follows, 0 = BitField section follows |
| — BitField form — | | |
| BitField | MaxVendorId | One bit per vendor, index 0 = vendor ID 1 |
| — Range form — | | |
| NumEntries | 12 | Number of RangeEntry records that follow |
| RangeEntry × NumEntries | | Each: `IsARange` 1 bit; `StartOrOnlyVendorId` 16 bits; `EndVendorId` 16 bits, **present only when IsARange = 1** |

The encoding choice is mandated, not free: "Encoding logic should encode with the encoding scheme
that results in the smaller output size for a given set." Compare both serialisations and keep the
shorter one per section. Ranges are "inclusive contiguous ascending-order series". A vendor ID
outside every range is "assumed to have no consent" (consent section) / no LI established (LI
section). [spec]

Naming note: the brief's "RangeSegment" is not in the document. `grep -c RangeSegment` on S2 is
`0`; the record's term is `RangeEntry`, 19 occurrences.

### 3.4 Publisher Restrictions section (core segment)

| Field | Bits | Rule |
| --- | --- | --- |
| NumPubRestrictions | 12 | "Value is required even if it is 0" — the section's *content* is optional except this count |
| PurposeId | 6 | The vendor-declared purpose the publisher overrides |
| RestrictionType | 2 | `0` flatly not allowed; `1` require consent; `2` require legitimate interest; `3` "UNDEFINED (not used)" |
| NumEntries | 12 | RangeEntry count for this restriction |
| RangeEntry × NumEntries | | Same three-field shape as 3.3 |

S2's vendor-side rule for `RestrictionType`, quoted because it is the part implementers get
backwards: "Vendors must always respect a 0 (Not Allowed) regardless of whether or not they have
not declared that Purpose to be 'flexible'. Values 1 and 2 are in accordance with a vendor's
declared flexibility." For a vendor whose registration is *not* flexible: `1` + registered as LI →
must not process; `1` + registered as consent → may ignore the signal; `2` + registered as consent
→ must not process. [spec]

Whether to write restrictions at all is a size decision S4 §5 ("Encoding publisher restrictions")
narrows: write restrictions only where they change the outcome — not for an undisclosed vendor,
not for a vendor the user deselected entirely, and for legal-basis flips only where the vendor
declared that purpose flexible in the GVL. [spec]

### 3.5 Disclosed Vendors segment (mandatory)

| Field | Bits | Rule |
| --- | --- | --- |
| SegmentType | 3 | Enum "0 Default ( Core ) 1 DisclosedVendors 3 PublisherTC"; "DisclosedVendors segment is 1 which is 001 in binary" |
| MaxVendorId | 16 | Highest vendor ID encoded |
| IsRangeEncoding | 1 | 1 Range / 0 BitField |
| BitField, or NumEntries + RangeEntry | as 3.3 | "Set the bit corresponding to a given vendor to 1 if the CMP has disclosed the" vendor in the UI |

This segment was optional and became mandatory: S2 "Why was the disclosed vendor section made
mandatory in TCF 2.3?" — "there is no longer any uncertainty about whether a vendor that only
declares special purposes has been disclosed (previously a blank section left disclosure
ambiguous). If a vendor declaring special purpose(s) appears in the disclosed vendors list, it
means that the vendor has been presented to the user and is permitted to operate under the declared
special purpose(s)." S6 sets the dates. [spec]

[encoder 1.5.21] `SegmentIDs.ID_TO_KEY = [CORE, VENDORS_DISCLOSED, VENDORS_ALLOWED, PUBLISHER_TC]`
with the comment "2 = OOB vendors allowed". S2's enum lists only 0, 1 and 3. A decoder must
tolerate a segment it does not model; an encoder must not emit 2.

### 3.6 Publisher TC segment (optional)

| Field | Bits | Rule |
| --- | --- | --- |
| SegmentType | 3 | "PublisherTC segment is 3 which is 011 in binary" |
| PubPurposesConsent | 24 | Publisher's own consent, standard TCF purposes |
| PubPurposesLITransparency | 24 | Publisher's own LI transparency |
| NumCustomPurposes | 6 | Count of publisher-defined custom purposes; IDs run 1..N |
| CustomPurposesConsent | NumCustomPurposes | Variable width, taken from the preceding field |
| CustomPurposesLITransparency | NumCustomPurposes | Variable width, same |

[encoder 1.5.21] confirms the variable-width edge case: `SegmentEncoder` falls back to
`numBits = Number(tcModel[Fields.numCustomPurposes])` for
`publisherCustom[Consents|LegitimateInterests]` "because they are of variable length".

**On `isFullPurposeIDs`: the record is genuinely silent, because the field is absent.**
`grep -c "isFullPurposeIDs\|FullPurposeIDs"` on S2 is `0`, and the string appears nowhere in
`@iabtechlabtcf/core@1.5.21`. The current Publisher TC segment has no such bit: purpose consent is
a flat 24-bit field, and the only optional-width mechanism in the segment is
`NumCustomPurposes`. Whoever told you the field exists is describing a layout that neither the
current spec text nor the reference codec contains. Do not encode a bit for it.

### 3.7 Cross-checks for a new encoder

Build the 213-bit prefix against these, then diff the base64url output rather than trusting a
round trip: `Fields` names, `FieldEncoderMap` per-field encoders (`LangEncoder` for
`consentLanguage` and `publisherCountryCode`, `DateEncoder` for the two timestamps,
`FixedVectorEncoder` for the 12/24-bit vectors, `VendorVectorEncoder` for vendor lists and
`vendorsDisclosed`, `BooleanEncoder` for the three flags), and `BitLength` for widths.
`SegmentSequence` emits `[CORE, VENDORS_DISCLOSED, PUBLISHER_TC]` when `isServiceSpecific` is
true, which is the shape a mobile CMP wants. [encoder 1.5.21]

## 4. What v2.1, v2.2 and v2.3 changed, and what our negotiation implies

### 4.1 The deltas

**v2.1** — "Added the Device Storage Access & Disclosure to address the Planet 49 ruling"
(S4 "What changed in v2.1"). Two documents in `TCFv2/` cover it; see
[Could not read](#9-unverified-and-could-not-read) — I did not read them, so this document makes
no claim about their contents beyond the duty in 4.4 below. [spec]

**v2.2** — S4 "What changed in v2.2": "revised purpose names and descriptions, introduced
retention periods for all purposes, removed legitimate interest for purposes 3 to 6, the
introduction of data categories used in conjunction with the purposes, support for legitimate
interest claim urls, adding support for localized policy urls, deprecation of the `__tcfapi`
command `getTCData` and introducing a more robust vendor compliance program." S2 "Why was support
for legitimate interest for purposes 3 to 6 deprecated?" makes the prohibition concrete: LI may no
longer be relied on for purposes 3, 4, 5 and 6. S2 "Managing conflicting string versions": "With
the release of TCF v2.2, the policy version has been incremented to version 4. Post 30 September
2023 a TC String created with a policy version set to smaller than 4 will be deemed invalid."
[spec]

**v2.3** — one substantive signalling change, plus dates and a clarification. [spec]

- Disclosed Vendors is **mandatory** (3.5). S6: "TCF Version 2.3 was released on 19th June 2025";
  "the transition period ... concludes on 28th February 2026"; "TC Strings created after 28
  February 2026 without this segment will be considered invalid"; "TC Strings created before 28
  February 2026 without a [disclosed vendors segment] will remain valid until they progressively
  get replaced as users renew and/or change the choices."
- **No re-surfacing duty**: "CMPs must update their live installations to include the [segment] ...
  As previously communicated, CMPs should not be required to re-surface the UI to accommodate this
  change." And a sharp edge for retrofitters: "CMPs that already made use of the previously
  optional [segment] or kept record of which Vendors were disclosed at the time TC Strings were
  initially created may update existing TC Strings (please note that the lastUpdated field should
  not be changed in such a case). However, CMPs that did not keep a record ... should wait for
  users to renew and/or change the choices."
- Special-purpose vendors read the disclosure bit, not the LI bit: "Vendors that only declare
  Special Purposes shall also rely on the [disclosed vendors bit] to determine if the CMP has
  established transparency on their behalf instead of relying on the LI bit for their Vendor IDs in
  the Vendor Legitimate Interest Section."
- Segment ordering was clarified, not changed: core first, remaining segments in any order because
  each carries a segment ID (S6 "Clarification on the ordering of the segments in the TC String";
  committed 2025-11-22 as "added clarification for segment order").
- A retired workaround, relevant to any string we may still be holding: "For TC strings created
  prior to March 1, 2026, the Legitimate Interest bit was set to 1 for vendors declaring Special
  Purposes. This workaround was removed from the specification as of April 2026" (S2, same
  section).

**v2.4** — S2's own history has a May 2026 row: "updated GVL JSON spec to include new
StandardTexts field. Also removed text requiring Special Purpose–only vendors to be disclosed
under the Legitimate Interest declaration." The IAB Europe policies document carries version string
`2026-05-29.5.0.b`, and the spec repo has a commit "Changes to TCF spec based on new policy version
5.0.b" (2026-05-07). I read the policies document and the live GVL, not a published v2.4 change
list, so I am not going to tell you what else is in it. [spec] for what is quoted; silent elsewhere.

### 4.2 What our TCF-policy-version negotiation means for mobile

`packages/iab` does not hardcode a policy version: the encoder takes it from the served list,
`TCModel` defaults to 5 (TCF 2.3), and a list declaring 4 encodes 4
([tcf-readiness.md](/docs/internal/tcf-readiness.md),
verified there against the installed codec). The live GVL agrees with the default:

```console
$ curl -s https://vendor-list.consensu.org/v3/vendor-list.json | jq '{gvlSpecificationVersion,vendorListVersion,tcfPolicyVersion,lastUpdated}'
{"gvlSpecificationVersion":3,"vendorListVersion":177,"tcfPolicyVersion":5,"lastUpdated":"2026-09-17T16:00:19Z"}
```

(S8. The URL is the one S2 documents under "Where can I access the Global Vendor List?", which
also notes the old `vendorlist.consensu.org` domain was decommissioned on 31 January 2021.)

For a mobile core that means four things, in priority order:

1. **Encode 5, and write `IABTCF_PolicyVersion` = 5.** At policy 5 the Disclosed Vendors segment is
   not optional, so "we set `vendorsDisclosed` to whatever appeared in consent or LI state" is a
   compliance defect, not an MVP shortcut. `packages/iab/src/index.ts:812-828` carries an inline
   "For MVP" comment for exactly this, and tcf-readiness already records that a vendor shown in
   the UI but never toggled is missing from the string. On mobile the same bug is worse, because
   the special-purpose rule in 4.1 turns a missing bit into "not disclosed".
2. **A policy-4 fallback stays valid but is a trap.** Strings under policy 4 are not invalidated by
   the 30-September-2023 cutoff, which only forbids versions below 4. What a v4-firing deployment
   loses is the mandatory segment. If a customer's backend pins an archived GVL, say so in the
   docs rather than letting the string silently drift.
3. **Re-establishment is version-driven, and we already have the hook.** S2 "Global Vendor List and
   TCF Policy Updates": "CMPs shall compare the `TcfPolicyVersion` encoded in a TC String with the
   `TcfPolicyVersion` property in the latest Global Vendor List ... If the policy version number in
   the latest GVL is different from the value in your TC String, then you need to re-establish
   transparency and consent for that user." S5 Chapter II §5.7 is the matching duty: "A CMP must
   resurface the Framework UI if the MO indicates ... that changes to the Policies are of such a
   nature as to require re-establishing Legal Bases." Both cores already model a server-supplied
   deadline (`nextDeadline`), so this belongs there rather than in a new flag.
4. **Do not retrofit the segment by guessing.** S6's rule is explicit: only backfill
   `vendorsDisclosed` for strings whose disclosure set we actually recorded, and leave `lastUpdated`
   alone when we do. Our native envelope does not today record a disclosure set, because there is no
   disclosure concept in it. So for c15t: no backfill until we store what was shown.

## 5. What a CMP must render in-app

The binding text is S5 Appendix B ("User Interface Requirements"), which "should be read in
conjunction with Chapter II (Policies for CMPs), Chapter IV (Policies for Publishers), and Chapter
V (Policies for Interacting with Users)". S4 §6 "CMP interface requirements" delegates to it
wholesale: "Please refer to the policies for the minimal information / functionality that needs to
be shown on the first screen of the UI and the information that must be present on second/additional
layers of the UI." [spec]

The two-frame pattern is not a convention: S5 defines "Initial Layer" as "information that must be
made visible to the user in the UI prior to the user being able to give his or her consent", and
Policy B(a) permits "a so-called layered approach that provides key information immediately in an
Initial Layer and makes more detailed information available elsewhere in additional layers". Policy
C(b) then states what the Initial Layer must contain and Policy C(c) mandates "a secondary layer".
The mobile shape of Policy C(a): the UI "must be displayed prominently and separately from other
information, such as the general terms and conditions or the privacy policy, **in a modal or banner
that covers all or substantially all of the content of the website or app**." [spec]

### 5.1 Initial Layer (Policy C(b))

Must: I. that information is stored on and/or accessed from the device; II. that personal data is
processed and the nature of it; III. that third-party vendors store/access and process, **the
number of third-party vendors**, and a link to the list of named third parties; IV. **the list of
distinct and separate purposes**, "using at least the standardised names and/or Stack names as
defined in Appendix A"; V. the special features used. Must: VII. the scope of the choice
(service-specific, group-specific, multi-device; group link if group); VIII. that consent can be
withdrawn at any time and how to resurface the UI. Should: VI. consequences of choosing either way;
IX. that some vendors process on legitimate interest without requesting consent, the right to
object, and a link to the LI layer. Must: X. a consent call to action; XI. a call to action to
customise choices. [spec]

### 5.2 Secondary layer (Policy C(c))

Must let the user: I. review "the list of named Vendors and a link to each Vendor's privacy policy,
their Purposes, Special Purposes, associated Legal Bases and corresponding retention period, their
Features and Special Features and the categories of data collected and processed"; II. review
purposes, special purposes, features and special features with full standard text and illustrations,
"the number of Vendors seeking consent for each of the Purposes ... and have a way to see those
Vendors"; III. "make granular and specific consent choices with respect to each Vendor, and,
separately, each Purpose"; IV. "make granular and specific opt-in choices with respect to each
Special Feature"; V–VI. the LI and consequence information if the Initial Layer omitted it; VII.
"review Vendors' maximum device storage duration and whether Vendors refresh such duration".
Per-vendor disclosure is therefore a per-vendor rendering duty, not a count. [spec]

### 5.3 The rest of Appendix B that mobile gets wrong

- **Default off.** Policy C(d): on any layer with granular purpose or special-feature controls,
  "the default choice must be 'no consent', 'no opt-in' or 'off'". [spec]
- **Legitimate interest gets its own single layer.** Policy D(a): transparency about LI processing
  "must be provided at least through an easily accessible link to the relevant layer ... dealing
  with processing on the basis of legitimate interests". Where a purpose is offered on both bases,
  D(b) puts that link in the Initial Layer. Policy D(c) requires "a single secondary layer" with,
  among other things, "access controls within the Framework UI to object to processing of their
  personal data on the basis of a legitimate interest" (D(c)(III)), per-vendor and per-purpose
  objection (D(c)(V)), the vendor review list plus "a link to each Vendor's explanation of its
  legitimate interest(s) at stake" (D(c)(VI)), and D(c)(VII) "review where applicable the storage
  and access information relating to the CMP's recording of Signals, including the maximum device
  storage duration." [spec]
- **Stacks are a substitute, not a substitute for control.** S5 Appendix B: "Stacks may be used to
  substitute Initial Layer information about two or more Purposes and/or Special Features" and "may
  be used on a secondary layer allowing users to make consent choices ... so long as granular and
  specific controls with respect to each Purpose and/or Special Feature are provided elsewhere in
  additional layers". A stack-only sheet is non-compliant. [spec]
- **Copy is not ours to write.** B(b): transparency "only on the basis of the standard Purpose,
  Special Purpose, Feature, and Special Feature names and definitions of Appendix A as they are
  published on the Global Vendor List or using Stacks", and UIs "must make available the standard
  user-friendly text, and where applicable the standard illustrations, for each Purpose, Special
  Purpose, Feature, Special Feature and Category of data". B(c): non-English UIs must use "official
  translations ... as they are published on the Global Vendor List". B(d): vendor transparency only
  "on the basis of the information provided, and declarations made by Vendors as they are published
  on the Global Vendor List". This is the single largest mobile data-plumbing requirement: the GVL's
  names, descriptions, illustrations URLs, data categories, retention periods and translations all
  have to reach the device. [spec]
- **Features are not toggles.** B(f): on a layer where the user reviews features, "the standard
  feature explanations text should be provided, and Features should not be associated with controls,
  so as to not mislead users", and the UI "must inform users that their Vendor choices are limited
  to Purposes and Special Features and that it does not enable them to object to disclosed Vendors
  processing personal data for Special Purposes and that Special Features may be used for Special
  Purpose 1 ... regardless of the user's choice about Special Features". [spec]
- **Call to actions are a design constraint with a number in it.** C(g): calls to action "must not
  be invisible, illegible, or appear disabled ... they must have matching text treatment (font, font
  size, font style) and, for the text of each, a minimum contrast ratio of 5 to 1", applying to the
  two primary calls to action. [spec]
- **Withdraw must be as easy as accept.** C(f): resurface "from an easily accessible link or call to
  action, such as a floating icon or a footer link ... or from the **top-level settings of the
  Publisher's app**", and if the Initial Layer offered "Consent to all" then "an equivalent call to
  action ... to withdraw their consent for all Purposes and Vendors must be provided in the
  Framework UI that the user resurfaces". On iOS the settings-screen deep link is the idiomatic
  landing point; opening the host app's system-settings pane from inside it is an iOS platform
  capability, not a TCF one, and I did not verify that API surface here. [spec] for the duty.
- **Non-framework vendors must be distinguishable**, both in B(e) and C(e), and S5 Chapter II §6.1
  repeats it for CMPs that work with vendors absent from the GVL. [spec]
- **Publisher suppression has a signalling cost.** Chapter II §5.8: if a publisher instructs the CMP
  not to disclose a purpose, special feature or vendor, "the Signals the CMP generates must
  appropriately reflect ... that no Legal Bases and/or opt-ins have been established", and "Special
  Purposes, and Features must always be disclosed if at least one of the Vendors disclosed has
  declared itself using them." §5.9 requires publisher restrictions to be implemented "by making
  appropriate changes in the User Interface to reflect such restrictions, and by creating the
  appropriate Signals". [spec]
- **One derogation, and it is the publisher's.** C(h): a publisher need not offer granular choices if
  it "implements a way for the user to access its content without consenting through other means,
  for example by offering paid access that does not require consenting to any Purposes" — "all other
  Policies remain applicable". [spec]

### 5.4 How many things that is, right now

From the live GVL (S8, fetched 2026-09-18): 11 purposes, 3 special purposes, 3 features, 2 special
features, 45 stacks, and 1214 vendors. S5 Appendix A carries the same 45 stacks and the purpose and
feature definitions the UI must reproduce verbatim. A mobile preference centre that renders 11
purpose rows and lazy-loads a 1214-vendor list is doing the minimum the policy asks, and the
bandwidth story is a mobile-specific problem the specs do not address. [spec] for the counts, since
they are S8 data on the day I read it and will drift.

## 6. Persistence and expiry, against how our cores actually store state

What our code does today, verified on this branch:

| Fact | Where |
| --- | --- |
| iOS consent snapshot, records and pending queue in the Keychain; generic-password items under service `com.c15t.core`, accounts `com.c15t.subject` / `com.c15t.snapshot` / `com.c15t.pending` | `native/core-swift/Sources/C15tCore/ConsentStore.swift:7-11,184-250`; `native/CONTRACT.md:284-287` |
| Android primary store is AES-GCM encrypted **files** in `noBackupFilesDir`; unencrypted `SharedPreferences` file `c15t.consent.fallback` is the keystore-failure fallback; subject id in `c15t.subject` | `native/core-android/c15t-android/src/main/kotlin/com/c15t/android/C15tStores.kt:31-53,93,99-125` |
| No TCF at all: "IAB TCF is out of scope for this phase. No TC string, no GVL state, no `IABTCF_*` keys." | `native/CONTRACT.md:7-8` |
| Consent expiry is server-driven: the evaluator derives `nextDeadline` from `policy.choiceMaxAgeMs` | `native/core-swift/Sources/C15tCore/PolicyEvaluator.swift:93,192`; `ConsentCore.swift:468` |
| The only local timer-like constant is a 7-day cap on queued saves, not on consent | `native/core-swift/Sources/C15tCore/PendingSaveQueue.swift:96` (`maxAgeMs = 7 * 24 * 60 * 60 * 1000`) |
| Web side: TC string cookie max-age 395 days, and a 395-day retention constant | `packages/iab/src/tcf/cmp-api.ts:397`; `packages/iab/src/authority.ts:7` |
| iOS Keychain items survive uninstall, so a reinstall is not a fresh install; Android needs `pm clear` | `native/CONTRACT.md:566` |
| `reset()` must leave no `explicitChoice`, notice dismissal, policy claim or queued save, while keeping subject id, overrides and privacy signals | `native/CONTRACT.md:560-575` |

Where the specs disagree with that:

1. **A TC String has no expiry field, and nothing in the policy sets a maximum storage duration
   for one.** The 13-month figure people quote appears in S2's rationale for the
   Created/LastUpdated change — "the requirements of remaining users of their choices, as
   appropriate and at least every 13 months" — and I found no `13` month rule anywhere in S5
   (`grep -nE "\b13\b|13-month"` on the extracted policies text returns nothing about duration).
   The live re-establishment mechanism is the policy-version comparison in S2 "Global Vendor List
   and TCF Policy Updates" plus S5 Chapter II §5.7. So the honest reading is: **13 months is not a
   documented TCF storage limit; policy-version drift is the trigger, plus whatever the relevant
   authority requires.** Our web 395-day constant is consistent with the 13-month habit and is not
   contradicted by anything I read. [spec] for what is quoted; the absence is a grep result on S5.
2. **Native consent would live forever.** `nextDeadline` exists only because the backend sends
   `choiceMaxAgeMs`. A native core that writes a TC string inherits a signal with no local ceiling
   and no policy-version check of its own. S2's rule is a *shall*: compare the string's
   `TcfPolicyVersion` to the latest GVL and re-establish if they differ. That check does not exist
   anywhere in either core, and nothing in the contract requires it. This is the sharpest
   persistence gap.
3. **Backup and uninstall behaviour are asymmetric across the two platforms, and the bus makes it
   worse.** iOS Keychain items outlive uninstall (`native/CONTRACT.md:566`); Android consent lives
   in `noBackupFilesDir`, deliberately outside auto-backup, and `pm clear` wipes it. Adding the bus
   means defaults on iOS are now in device backup [S10] while our authoritative record is not
   necessarily, and Android's default preferences file is backed up by default while our encrypted
   store is not. The rule that keeps this honest is already in the contract: the bus is a
   projection, never a source. A restore that brings back `IABTCF_*` without a stored envelope must
   still serve `ready: false, policyPending: true` with optional categories denied.
   [spec] for the duty; ours for the mechanism.
4. **`reset()` gains two more write targets.** S1's vestigial-value note and S5 Chapter II's
   withdraw-easily duty both mean: clear the bus keys as well as the Keychain items and the Android
   files. Because the bus is a projection of the snapshot, the assertion to pin is "no IABTCF_ key
   survives reset()", not a list of 19 removals.
5. **Offline GVL caching is explicitly allowed on mobile, and only for that reason.** S2 "Where can
   I access the Global Vendor List?": "Previous versions of the GVL may only be used in cases when
   the current version cannot be downloaded (such as when operating in-app while offline), or for
   change control management." That is the licence for shipping a bundled GVL snapshot in a mobile
   SDK, and also the limit on how long you may keep using it. [spec]
6. **Vendor storage durations must be renderable, which is a persistence question in disguise.**
   Appendix B C(c)(VII) and D(c)(VII) require the device to show vendor maximum storage durations
   and the CMP's own recording duration; S5's own changelog records that "Version 2022-06-20.3.5 –
   Update to indicate the mandatory nature of the provision of a devicestorage.json file by vendors
   (Chapter III / Policy 16 2bis; Appendix B / C(c)(vii))". I did not read the two device-storage
   documents themselves, so the plumbing requirement is all I am claiming. [spec] for the duty.

## 7. Requirements our current cores would fail

Read as: if the mobile TCF ticket were implemented against the contract exactly as written today,
these are the spec duties it would miss. Ordered by how much they matter.

1. **No bus at all.** `native/CONTRACT.md:7-8` excludes `IABTCF_*` outright. Against S1's "shall set
   the NSUserDefaults/SharedPreferences variables" and S5 Chapter II §4.1's full-specifications
   duty, a c15t mobile SDK is currently invisible to every vendor SDK that follows the standard.
2. **Wrong location on Android even if we started writing keys.** `C15tStores.kt` uses
   `c15t.consent.fallback` and `c15t.subject`; S1 requires the application-default
   `PreferenceManager.getDefaultSharedPreferences(context)` file. Keys written into either named
   file satisfy nobody.
3. **Wrong location on iOS.** `KeychainStore` is unreachable from vendor code that follows S1. The
   bus must be `UserDefaults.standard`, with the Keychain kept as our authoritative copy.
4. **`vendorsDisclosed` would be an approximation on a mandatory segment.** `packages/iab/src/index.ts:812-821`
   discloses only vendors that already appeared in consent or LI state, with a "For MVP" comment.
   Under policy 5 that is both an invalid string shape risk (S6) and a wrong answer for
   special-purpose vendors (S2).
5. **No policy-version comparison, therefore no re-establishment.** S2 "Global Vendor List and TCF
   Policy Updates" is a shall; neither core has any equivalent of it.
6. **Nothing in the native state model can answer Appendix B.** The snapshot has
   `consentCategories`, `effectivePermissions` and five c15t categories; there is no purpose, special
   purpose, feature, special feature, stack, vendor, GVL-version, consent-screen, consent-language,
   publisher-CC, or disclosure-set concept. Every field the TC string needs — 3.2 — is
   unrepresentable today. The `iab` slot is still `JsonNull` on Kotlin, while Swift already carries a
   `KernelIABState` holding the served vendor list and nothing else.
7. **Special-purpose legitimate interest is still not encodable**, which tcf-readiness already
   records for web and which does not change on mobile: `@iabtechlabtcf/core@1.5.21` has no
   special-purposes bitfield. Confirmed here — `Fields.js` exposes `purposeConsents`,
   `purposeLegitimateInterests`, `specialFeatureOptins`, `publisherRestrictions` and nothing else in
   that family.
8. **Publisher restrictions and custom purposes are absent on native; the list and its scope are
   not.** S5 Chapter II §5.9 requires publisher restrictions to be both rendered and signalled and
   S4 §5 says when to write them, and neither core can express either. The vendor allowlist closed
   here. Each core reads the `gvl` that `/init` embeds and keeps it, and both now hold the
   publisher's declaration beside it: `NativeConfig.vendors` (`NativeConfig.kt:61`) and
   `CoreConfig.vendors` (`ConsentCore.swift:57`), where `null`/`nil` and an empty list all read as
   no scope declared. Web's `iab.vendors` does three jobs and mobile now does two of them. The
   request goes out with `x-c15t-vendors` (`C15tProtocol.kt:48`, `Transports.swift:53`): deduped,
   ascending, comma-separated, and absent above the same 500 that `MAX_GVL_QUERY_VENDOR_IDS` uses.
   The held list is pruned on every path it arrives by — `C15tKernel.kt:253` and `:1077`,
   `ConsentCore.swift:1076` and `:1490` — which is what makes it a read-path rule rather than a
   first-store rule, so bytes written before a host scoped the app stop disclosing vendors it never
   named. The prune carries the promise and the header only saves bytes: a producer that ignores the
   header and embeds the whole list is answered by that same line, which is also why an over-cap
   declaration sends no header and still gets a narrow device. The third job is still missing,
   because a device holds one list and reports it whole: web clears a `gvlReference.summary` that had
   counted the wider list (`packages/core/src/runtime/index.ts:272-283`) and there is no such summary
   to clear here. `@c15t/react-native` spells the declaration as the plugin's `vendors` prop, which
   becomes the `com.c15t.vendors` plist string and the `com.c15t.VENDORS` meta-data both cores read
   at launch, before JavaScript exists.
9. **No resurface affordance.** Appendix B C(f) wants an easily reachable resurfacing entry, naming
   "the top-level settings of the Publisher's app", and an equivalent withdraw-all control. The
   contract's surface model is `activeUI: none | banner | dialog | null` with no persisted
   preference-centre entry point.
10. **No consent-screen number, no consent language, no publisher country in native state.** All
    three are core-segment fields (3.2 #6, #7, #16) and all three must describe the UI that was
    actually shown. Defaulting them, as web does for `publisherCC: 'US'` and
    `purposeOneTreatment: false` in `cmp-api.ts:159,170,175`, is the same bug class tcf-readiness
    already flags where "`TCData` reported over `__tcfapi` also disagrees with the TC String".
11. **`reset()` does not yet clear a bus**, and iOS Keychain persistence across uninstall means a
    naive reset leaves a live signal behind (section 6, point 3 and 4).
12. **The GVL proxy question transfers.** tcf-readiness notes c15t/Inth operates `gvl.inth.app`
    (`packages/iab/src/tcf/constants.ts:25` `GVL_ENDPOINT`). A mobile SDK pointed at a proxy we run
    inherits the staleness and availability duties recorded there, and S2's caching rules above are
    the only licence for using an archived version offline.

## 8. Where sources disagree

1. **`IABTCF_UseNonStandardTexts` vs `IABTCF_UseNonStandardStacks`.** S1's table and S2's core field
   both say `UseNonStandardTexts`; S7's mobile key table says `IABTCF_UseNonStandardStacks` →
   `IABGPP_TCFEU2_UseNonStandardStacks`, and `irov/Mengine` reads the stacks spelling. **S1 is the
   stronger source**: it is the document that defines TCF in-app key names, and S7's own text points
   back at the TCF specs for expected values. S9 sides with S1: `Fields.useNonStandardTexts` appears
   31 times in the installed package and `NonStandardStacks` appears 0 times, so this is **not** a
   spec rename and anyone reading a rename into it is reading S7. Practical answer: write
   `IABTCF_UseNonStandardTexts`; a compatibility shim that also mirrors the stacks spelling is a
   one-line decision with a citable cost, not a default. [spec] vs [spec], resolved.
2. **Segment type 2.** S2's enum is `0` core, `1` DisclosedVendors, `3` PublisherTC; S9 reserves 2
   for OOB "vendors allowed". **S2 is stronger for what we emit.** Tolerate 2 on decode, never write
   it. Note global scope and OOB were deprecated on 1 September 2021 (S2 history; S1 `InAppTCData.isServiceSpecific`
   comment: "since Sept. 1st 2021, TC strings established with global-scope are considered invalid").
3. **A deprecated Android API is the required one.** S1 mandates
   `android.preference.PreferenceManager`, deprecated at API 29, and reads only through `getString`
   / `getInt`. A modern `DataStore` preference is *not* interchangeable: it is a different file and
   vendors will not find it. Follow the standard, and keep the deprecated call behind one internal
   writer so the platform's eventual removal is one file. [spec]
4. **Apple's guidance versus S1 on where consent data goes.** Apple: don't put personal or sensitive
   data in defaults, which are unencrypted on disk. S1: the TC data and TC string shall be in
   defaults / shared preferences. Both stand; the resolution is the dual-write in 2.3 with our own
   record in the Keychain, documented as a deliberate trade-off rather than discovered later.
5. **The brief's v2.3 key renames are unsupported.** `grep -c PublisherPurposesRestrictions` and
   `grep -c UseNonStandardStacks` on S1 are both `0`. The keys are `IABTCF_PublisherRestrictions{ID}`
   and `IABTCF_UseNonStandardTexts`, and I have no document to cite for a rename. If a v2.3 rename
   exists, it is in something I could not read (section 9), not in S1.
6. **The 13-month figure.** S2's rationale mentions "at least every 13 months"; S5 5.0.b states no
   duration rule, and the enforceable trigger in both documents is policy-version drift. Where they
   differ in emphasis I follow S5, because it is the document that states CMP obligations, and I
   report the 13-month line as rationale rather than a limit.

## 9. Unverified, and could not read

Not in this document as findings:

- **A standalone TCF v2.3 (or v2.4) format document on the IAB Tech Lab portal.** Both plausible
  portal URLs 404 from this machine. Everything I claim about v2.3 comes from the single
  in-repo S2 file, S4, S6, or the live GVL.
- **`TCFv2/IAB Tech Lab - Device storage duration and access disclosure.md`** and
  **`TCFv2/Vendor Device Storage & Operational Disclosures.md`** — both exist in the folder listing;
  I did not download or read either. Any device-storage / `devicestorage.json` detail beyond the
  Appendix B rendering duty is out of scope here.
- **"TCF v2.2 Compliance Form For Non-Web CMPs"**, cited by tcf-readiness.md as listed on
  `iabeurope.eu/tcf-supporting-resources/`. That link is not on the page as fetched 2026-09-18 and I
  found no replacement. If that form is where mobile-specific compliance duties are enumerated, it
  is the most important unread artifact in this list.
- **`260227-Controls-Catalogue-TCF.pdf`**, **`TCF-v2.2-CMP-Validator-User-Guide_15052023.pdf`**, the
  **TCF v2.2 FAQ (Nov 2023)**, and the **APD decision FAQ (Jan 2026)** — all linked from
  supporting-resources, none read.
- **Google's official mobile TCF / UMP documentation.** Everything I say about Google reading keys
  comes from first-party adapter source in `googleads/*-mediation` and from the
  `react-native-google-mobile-ads` community package, not from a Google policy page.
- **S5 read as extracted text, not rendered layout.** I used `pypdf` on the 79-page PDF, so clause
  lettering survived but footnote placement and table geometry may not have. Section numbers quoted
  above are the document's own.
- **`IABTCF_EnableAdvertiserConsentMode`** — single hit in a vendor's demo target. Not a finding.
- **Whether an Apple app-group suite is ever required for third-party SDK reads.** Silent in the TCF
  record; my conclusion in 2.2 rests on Apple's sandbox and defaults documentation plus the fact that
  vendor SDKs are linked into the host binary. I did not find a source that states "an iOS ad SDK
  runs in the host app's process" in those words; it is platform architecture, not a citation.
- **The Android application-default preferences file name.** Android's reference page confirms the
  getter exists and that a name is returned; the page text I fetched does not print the literal, so
  this document never names it.

## 10. Reproducing the checks

```console
# key counts on the CMP API spec (S1)
grep -c IABTCF "IAB Tech Lab - CMP API v2.md"
grep -o "IABTCF_[A-Za-z{}]*" "IAB Tech Lab - CMP API v2.md" | sort | uniq -c
grep -c IABTCF "Mobile In-App Consent APIs v1.0 Final.md"          # 0
grep -c "isFullPurposeIDs\|FullPurposeIDs" "…Consent string…v2.md"  # 0
grep -c RangeSegment "…Consent string…v2.md"                        # 0
grep -c "UseNonStandardStacks\|PublisherPurposesRestrictions" "…CMP API v2.md"   # 0

# what the vendored codec actually contains
cd node_modules/.bun/@iabtechlabtcf+core@1.5.21/node_modules/@iabtechlabtcf/core
grep -rho "useNonStandard[A-Za-z]*" . | sort | uniq -c             # 31 useNonStandardTexts, 0 stacks
cat lib/mjs/model/Fields.js lib/mjs/model/SegmentIDs.js
sed -n '1,45p' lib/mjs/encoder/Base64Url.js

# which files the spec repo holds
curl -s https://api.github.com/repos/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/contents/TCFv2 | jq -r '.[].name'

# current policy version and the counts the UI must render
curl -s https://vendor-list.consensu.org/v3/vendor-list.json | jq '{vendorListVersion,tcfPolicyVersion,lastUpdated,purposes:(.purposes|length),specialPurposes:(.specialPurposes|length),features:(.features|length),specialFeatures:(.specialFeatures|length),stacks:(.stacks|length),vendors:(.vendors|length)}'
```

Reader evidence is repo paths inline in 1.2 and 1.4, gathered with GitHub code search on the exact
key names from this session. The Google-Mobile-Ads-reading-the-v1-keys evidence is a config block in
`shift/sun50iw12p1-research` `firmware/fex_files/all_sections.txt`, i.e. a device-firmware mirror,
not a Google document — trust it as a hint about Google's collection list and confirm against
Google's own docs before shipping anything that depends on it. The 365-day
`IABTCF_TCString` deletion behaviour I saw only in `binouze/GoogleUserMessagingPlatform`, a
third-party copy of Google's UMP runtime: **[unverified]**, do not design around it.
