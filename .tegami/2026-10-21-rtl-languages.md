---
packages:
  '@c15t/ui': patch
---

### Yiddish and other right-to-left languages render right to left

Banners, dialogs and preference centers now set `dir="rtl"` for Yiddish
(`yi`), Central Kurdish (`ckb`), Uyghur (`ug`), Syriac (`syr`) and N'Ko
(`nqo`), and for the older codes `iw` (Hebrew) and `ji` (Yiddish). They
rendered left to right before.

A script subtag now decides the direction over the language: `ku-Arab`,
`pa-Arab` and `az-Arab` are right to left, and `sd-Deva` is left to right.

Plain `ku` is now left to right. It usually means Kurmanji, which uses
Latin script. For Sorani, use `ckb` or `ku-Arab`.
