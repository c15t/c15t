---
"@c15t/react-native": patch
---

Start the iOS consent core before React Native actually starts. The binding asked the linker to run an `__attribute__((constructor))` at image load, but the pod is a static archive and the linker keeps an archive member only if something references it or the host links `-ObjC` and the member defines an Objective-C class or category. A file containing nothing but a constructor is neither, so the member was dropped from the built app: the pod's classes linked, the app carried no `__TEXT,__init_offsets` section, and the core came up on the first `getBootstrap()` from JavaScript rather than before it. The launch hook now lives on an Objective-C class in the same file, which the linker keeps and `+load` runs, so stored consent is hydrated before the React host is created.
