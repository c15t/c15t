---
'@c15t/react-native': minor
---

Your app can now say which vendors it discloses. Both embedded cores carry a `vendors` declaration beside the category scope they already read, and the vendor list they hold is pruned to it, so a device discloses the partners you named rather than the scope the server happened to embed. This is the native twin of the `iab.vendors` array a web host passes to its provider.

Set it as the Expo plugin's `vendors` parameter, or as the `com.c15t.vendors` `Info.plist` string and the `com.c15t.VENDORS` `<meta-data>` for an app that configures its native projects by hand. Omitting it, or declaring nothing usable, keeps every vendor the backend serves: `null` and an empty list are the same answer, which is the reading both web narrows already give. A scope narrows the vendor drawer and nothing else. Purposes, features, stacks and both version numbers stay exactly as served, because those describe the framework rather than the audience and a consent string still has to say which policy version graded it, so pruning the drawer never changes what a purpose means.

The pruning is the promise and it runs on every path a list arrives by, including state stored before you declared a scope or by a build that had none. The same declaration also goes out on `GET /init` as an `x-c15t-vendors` header, deduplicated and ascending, so the response stops carrying ids the app would prune anyway. That header is an optimisation about bytes and never the guarantee: a declaration wider than 500 ids is too wide for one request line and is sent as no header at all, and a backend that ignores the header and embeds the whole list is answered by the same pruning. Animating the drawer is out of scope here; narrowing what it may contain is the supported path.
