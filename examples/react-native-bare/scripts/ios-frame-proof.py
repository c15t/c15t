#!/usr/bin/env python3
"""Frame evidence for the iOS journey: two hashes and a change percentage.

Hashing the whole PNG is the mistake that made the first iOS proof worthless. The
status bar holds a clock, so every screenshot differs from the one before it, and a
step that never ran still looked like a step that did. This tool therefore:

- hashes the full frame, for the record;
- hashes the frame below the system band, which is the app, so a step whose only
  change is the clock reads as nothing happening;
- reports how much of the app area actually changed between two frames, which tells
  "one switch moved" from "the alert was dismissed" from "nothing at all".

Usage:
    ios-frame-proof.py digest <shot.png> [--status-band 177]
        -> <full-md5> <app-md5>
    ios-frame-proof.py diff <before.png> <after.png> [--status-band 177]
        -> <changed-percent-of-app-area>
"""

import argparse
import hashlib
import sys

try:
    from PIL import Image
except ModuleNotFoundError:
    sys.exit("Pillow is required: python3 -m pip install pillow")

# The iPhone status band, in screenshot pixels: 59pt at 3x. Cropping it drops the
# clock and the battery, and nothing the consent surfaces draw.
STATUS_BAND_PX = 177


def app_area(path, band):
    image = Image.open(path).convert("RGB")
    return image.crop((0, band, image.width, image.height))


def digest(path, band):
    with open(path, "rb") as handle:
        full = hashlib.md5(handle.read()).hexdigest()
    app = hashlib.md5(app_area(path, band).tobytes()).hexdigest()
    return full, app


def diff(a, b, band):
    ia, ib = app_area(a, band), app_area(b, band)
    if ia.size != ib.size:
        return 100.0
    pa, pb = ia.load(), ib.load()
    w, h = ia.size
    changed = 0
    sampled = 0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            sampled += 1
            if pa[x, y] != pb[x, y]:
                changed += 1
    return 0.0 if sampled == 0 else round(100.0 * changed / sampled, 3)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["digest", "diff"])
    ap.add_argument("paths", nargs="+")
    ap.add_argument("--status-band", type=int, default=STATUS_BAND_PX)
    args = ap.parse_args()

    if args.cmd == "digest":
        full, app = digest(args.paths[0], args.status_band)
        print(f"{full} {app}")
        return 0
    print(diff(args.paths[0], args.paths[1], args.status_band))
    return 0


if __name__ == "__main__":
    sys.exit(main())
