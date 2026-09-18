#!/usr/bin/env python3
"""Measure the c15t consent surfaces in an iOS Simulator screenshot, in points.

Android gets a view tree from `uiautomator dump`. A headless iOS runner gets a
screenshot and nothing else: `simctl io` has no hierarchy dump, and this Xcode ships
no `Simulator.app` to read one from. So the geometry here comes off the rendered
pixels, which is the same evidence a reviewer's eye uses.

What it detects, and how:

- the branding tab: the one large filled block of the c15t blue. The app's own chrome
  is blue too, but as glyphs and hairlines, so requiring a long unbroken run of blue
  leaves the tab as the only candidate;
- the card: its border is the grey hairline framing a fill, so the left and right
  edges are the outermost border pixels in a band just clear of the tab, and the
  bottom is the last border pixel down the card's centre column;
- the buttons: the footer paints its own fill behind them, so a button is a run of
  card fill inside the footer band;
- the switches: an on switch reports the iOS green track, which the SDK does not
  recolour. An off switch is grey on a light card and is reported as unknown rather
  than guessed at.

Usage:
    ios-surface-metrics.py <shot.png> [--mode banner|dialog] [--scale 3]
                           [--truth /tmp/ui-parity/truth/light.json] [--json]

Exit 0 when every measured metric is inside tolerance, 1 when one is not, and 2 when
the surface was not found at all, because "not measured" must never read as "passed".
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    from PIL import Image
except ModuleNotFoundError:
    sys.exit("Pillow is required: python3 -m pip install pillow")

# The same table measure-mobile.py grades Android against, in points.
EXPECTED = {
    "card_left": (16.0, 2.0),
    "card_right_gap": (16.0, 2.0),
    "button_height": (35.5, 2.5),
    "button_column_gap": (16.0, 2.5),
    "action_row_gap": (8.0, 2.5),
    "row_pitch": (54.0, 3.0),
    "tab_width": (129.4, 2.0),
    "tab_height": (28.0, 2.0),
}

# Branding tab fill, light then dark, as /tmp/ui-parity/truth records them.
TAB_BLUES = ((51, 92, 255), (102, 133, 255))
ON_GREEN = (52, 199, 89)
# The web numbers were captured on a 411 CSS px viewport.
WEB_WIDTH = 411.0


def dist(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def is_grey(c, low=190, high=246, spread=10):
    """A light-mode hairline: three channels near-equal and mid-light."""
    return (
        abs(c[0] - c[1]) <= spread
        and abs(c[1] - c[2]) <= spread
        and low <= min(c)
        and max(c) <= high
    )


# The card border, the row dividers and the outlined button share one hairline tone.
# Everything a scrim dims falls outside it, which is what makes the card findable in
# front of a darkened app.
BORDER_TONE = (224, 239)


def is_border(c):
    return is_grey(c, BORDER_TONE[0], BORDER_TONE[1], 8)


def mode_of(c):
    """Rough chroma, so a coloured control is never mistaken for a hairline."""
    return max(c) - min(c)


class Frame:
    def __init__(self, path, scale):
        image = Image.open(path).convert("RGB")
        self.px = image.load()
        self.w_px, self.h_px = image.size
        self.scale = scale
        self.w = self.w_px / scale
        self.h = self.h_px / scale

    def pt(self, box):
        x, y, w, h = box
        return (x / self.scale, y / self.scale, w / self.scale, h / self.scale)

    def get(self, x, y):
        return self.px[max(0, min(x, self.w_px - 1)), max(0, min(y, self.h_px - 1))]


def blue(c):
    return min(dist(c, b) for b in TAB_BLUES) < 70


def solid_blue(f, box):
    """Is the block filled with blue, rather than a blue frame around white?

    Without this the app's own outlined button wins the search: its top border is an
    unbroken run of the accent blue several hundred points long, and it is on screen
    even when no consent surface is. The branding tab is a pill painted solid, with the
    wordmark inside it, so most of what it covers is blue.
    """
    x, y, w, h = box
    if w < int(60 * f.scale) or h < 2:
        return False
    blue_count = total = 0
    for yy in range(int(y), int(y + h), max(1, int(f.scale))):
        for xx in range(int(x), int(x + w), max(1, int(f.scale))):
            total += 1
            if blue(f.get(xx, yy)):
                blue_count += 1
    return total > 0 and blue_count / total >= 0.55


def find_branding_tab(f):
    """The largest filled blue block: the tab, never blue text."""
    best = None
    min_run = int(20 * f.scale)
    step = max(1, int(f.scale))
    for y in range(0, f.h_px, step):
        start = None
        for x in range(f.w_px + 1):
            on = x < f.w_px and blue(f.get(x, y))
            if on and start is None:
                start = x
            elif not on and start is not None:
                if x - start >= min_run:
                    mid = (start + x) // 2
                    top = y
                    while top > 0 and blue(f.get(mid, top - 1)):
                        top -= 1
                    bottom = y
                    while bottom < f.h_px - 1 and blue(f.get(mid, bottom + 1)):
                        bottom += 1
                    box = (start, top, x - start, bottom - top)
                    if solid_blue(f, box) and box[3] >= int(15 * f.scale):
                        area = box[2] * box[3]
                        if best is None or area > best[0]:
                            best = (area, box)
                start = None
    return None if best is None else best[1]


def tab_band(f, tab, mode):
    """A row band a few points inside the card, clear of the tab and its first text."""
    tx, ty, tw, th = tab
    if mode == "banner":
        return ty + th + int(3 * f.scale), ty + th + int(26 * f.scale)
    return ty - int(26 * f.scale), ty - int(3 * f.scale)


def modal(vals):
    vals = sorted(vals)
    return vals[len(vals) // 2] if vals else None


def card_edges(f, tab, mode):
    """The card the tab is glued to, in pixels, plus the signal used.

    Light paints a grey hairline around a white card on a white page, so the hairline
    is the signal and the page cannot be told from the card by colour alone. Dark
    paints a near-black card on a black page, so the fill change is the signal. Either
    way the walk runs down the card's own padding column, where no glyph can stand in
    it, and it keeps going across the dividers inside the card: a divider is followed
    by a flat fill, the card's outer frame is followed by a shadow ramp or by the page.
    """
    tx, ty, tw, th = tab
    ya, yb = tab_band(f, tab, mode)
    ya, yb = max(0, ya), min(f.h_px - 1, yb)

    card_fill = f.get(tx + tw // 2, (ya + yb) // 2)
    page_fill = f.get(int(2 * f.scale), (ya + yb) // 2)
    by_fill = dist(card_fill, page_fill) > 6

    lefts, rights = [], []
    for y in range(ya, yb):
        xs = [
            x
            for x in range(f.w_px)
            if (dist(f.get(x, y), card_fill) <= 6 if by_fill else is_border(f.get(x, y)))
        ]
        if len(xs) >= 2:
            lefts.append(min(xs))
            rights.append(max(xs))
    if not lefts:
        return None
    left, right = modal(lefts), modal(rights)
    if right - left < int(120 * f.scale):
        return None

    pad_x = left + int(5 * f.scale)
    start_y = (ya + yb) // 2

    def flat_ahead(y, step, n=14):
        """The fill beyond a frame or divider line, or None when it is a shadow ramp.

        The line itself is a few pixels of hairline, so it is stepped over first: what
        decides the question is the six pixels after it, flat inside the card and
        sliding outward across the shadow when the card has ended.
        """
        yy = y
        for _ in range(8):
            if not is_border(f.get(pad_x, yy + step)):
                break
            yy += step
        seen = [f.get(pad_x, yy + step * i) for i in range(1, n + 1)]
        if len(seen) < n:
            return None
        # A fill is dead flat; the shadow under the card edge slides by a point
        # every few pixels, which is what keeps the two apart at 14 pixels.
        return seen[0] if all(dist(c, seen[0]) <= 1 for c in seen) else None

    def walk(step):
        fills = [card_fill]
        y = start_y
        last = start_y
        while 0 < y < f.h_px:
            c = f.get(pad_x, y)
            if any(dist(c, fill) <= 7 for fill in fills):
                last = y
                y += step
                continue
            beyond = flat_ahead(y, step)
            if beyond is None:
                break  # a shadow ramp: the frame line ends the card here
            if by_fill and dist(beyond, page_fill) <= 6:
                break  # the walk has reached the page behind the card
            if not by_fill and dist(beyond, page_fill) <= 6 and dist(beyond, card_fill) <= 7:
                break
            fills.append(beyond)
            # Step over the frame or divider line and keep going.
            y += step
            while 0 < y < f.h_px and is_border(f.get(pad_x, y)):
                y += step
        return last

    top = walk(-1)
    bottom = walk(1)
    if mode == "dialog":
        bottom = min(bottom, ty)
    else:
        top = max(top, ty + th - int(6 * f.scale))

    # Report the frame line, not the last fill pixel: the border is part of the box.
    top -= 3
    bottom += 3
    if bottom - top < int(40 * f.scale):
        return None
    return (left, top, right - left, bottom - top), ("fill change" if by_fill else "hairline")


def footer_top(f, card, card_fill):
    """The row the footer starts on: the lower band paints its own fill."""
    cx, cy, cw, ch = card
    x = int(cx + 5 * f.scale)
    lo, hi = int(cy + 8 * f.scale), int(cy + ch)
    below = [f.get(x, y) for y in range((lo + hi) // 2, hi)]
    if not below:
        return None
    counts = {}
    for c in below:
        counts[c] = counts.get(c, 0) + 1
    footer_fill = max(counts, key=counts.get)
    if dist(footer_fill, card_fill) <= 4:
        return None
    run = 0
    for y in range(lo, hi):
        if dist(f.get(x, y), footer_fill) <= 2:
            run += 1
            if run >= int(10 * f.scale):
                return y - run + 1
        else:
            run = 0
    return None


def find_buttons(f, card):
    """Buttons: runs of card fill inside the footer's own fill, grouped into boxes."""
    cx, cy, cw, ch = card
    if ch is None:
        return []
    x0, y0, x1, y1 = int(cx), int(cy), int(cx + cw), int(cy + ch)
    card_fill = f.get(x0 + int(5 * f.scale), y0 + int(5 * f.scale))
    ft = footer_top(f, card, card_fill)
    if ft is None:
        return []
    footer_fill = f.get(x0 + int(5 * f.scale), ft + int(6 * f.scale))
    if dist(footer_fill, card_fill) <= 4:
        return []

    def is_card(c):
        return dist(c, card_fill) <= 7 and dist(c, footer_fill) > 4

    boxes = []
    for y in range(ft, y1):
        runs = []
        start = None
        for x in range(x0, x1 + 1):
            on = x < x1 and is_card(f.get(x, y))
            if on and start is None:
                start = x
            elif not on and start is not None:
                if (x - start) / f.scale > 24:
                    runs.append((start, x))
                start = None
        for a, b in runs:
            hit = next(
                (bx for bx in boxes if bx[4] >= y - 2 and not (b < bx[1] - 3 or a > bx[2] + 3)),
                None,
            )
            if hit:
                hit[1] = min(hit[1], a)
                hit[2] = max(hit[2], b)
                hit[4] = y
            else:
                boxes.append([y, a, b, a, y])
    def grow(bx):
        """Push the fill run out through the frame line drawn around it."""
        top, a, b, _, bot = bx
        for _ in range(int(3 * f.scale)):
            if is_border(f.get((a + b) // 2, top - 1)) or blue(f.get((a + b) // 2, top - 1)):
                top -= 1
            else:
                break
            for _ in range(int(3 * f.scale)):
                if is_border(f.get((a + b) // 2, bot + 1)) or blue(f.get((a + b) // 2, bot + 1)):
                    bot += 1
                else:
                    break
        for _ in range(int(3 * f.scale)):
            if is_border(f.get(a - 1, (top + bot) // 2)) or blue(f.get(a - 1, (top + bot) // 2)):
                a -= 1
            else:
                break
            for _ in range(int(3 * f.scale)):
                if is_border(f.get(b + 1, (top + bot) // 2)) or blue(f.get(b + 1, (top + bot) // 2)):
                    b += 1
                else:
                    break
        return (a, top, b - a, bot - top)

    return [
        grow(bx)
        for bx in boxes
        if 18 <= (bx[4] - bx[0]) / f.scale <= 80
    ]


def switch_rows(f, card):
    """y of every row whose switch reads on, i.e. shows the green track."""
    cx, cy, cw, ch = card
    x_probe = int(cx + cw * 0.93)
    ys = []
    last = -999
    for y in range(int(cy), int(cy + ch), max(1, int(f.scale))):
        if dist(f.get(x_probe, y), ON_GREEN) < 90 and y - last > 10:
            ys.append(y)
            last = y
    return ys


def summarize(path, mode, scale, truth_path):
    f = Frame(path, scale)
    out = {
        "screenshot": str(path),
        "pixels": [f.w_px, f.h_px],
        "points": [round(f.w, 1), round(f.h, 1)],
        "scale": scale,
        "mode": mode,
        "surface_found": False,
    }
    tab_px = find_branding_tab(f)
    if tab_px is None:
        out["error"] = "no branding tab, so no c15t consent surface is on screen"
        return out

    tab = f.pt(tab_px)
    framed = card_edges(f, tab_px, mode)
    if framed is None:
        out["error"] = "branding tab found, card behind it could not be framed"
        out["tab"] = [round(v, 1) for v in tab]
        return out
    card_px, edge_method = framed

    card = f.pt(card_px)
    buttons = [f.pt(b) for b in find_buttons(f, card_px)]
    switches = switch_rows(f, card_px)
    out.update(
        {
            "surface_found": True,
            "edge_method": edge_method,
            "tab": [round(v, 1) for v in tab],
            "card": [round(v, 1) for v in card],
            "card_left_gap": round(card[0], 1),
            "card_right_gap": round(f.w - (card[0] + card[2]), 1),
            "card_bottom_gap": round(f.h - (card[1] + card[3]), 1),
            "buttons": [[round(v, 1) for v in b] for b in buttons],
            "on_switch_rows": [round(y / scale, 1) for y in switches],
        }
    )

    checks = []
    pairs = [
        ("card_left", card[0]),
        ("card_right_gap", f.w - (card[0] + card[2])),
        ("tab_width", tab[2]),
        ("tab_height", tab[3]),
    ]
    for b in sorted(buttons, key=lambda b: b[3]):
        pairs.append(("button_height", b[3]))
    rows = {}
    for b in buttons:
        rows.setdefault(round(b[1] / 6), []).append(b)
    for group in sorted(rows.values(), key=lambda g: min(b[1] for b in g)):
        group.sort(key=lambda b: b[0])
        for a, b in zip(group, group[1:]):
            pairs.append(("button_column_gap", b[0] - (a[0] + a[2])))
    ordered = sorted(rows.values(), key=lambda g: min(b[1] for b in g))
    for prev, nxt in zip(ordered, ordered[1:]):
        pairs.append(("action_row_gap", min(b[1] for b in nxt) - max(b[1] + b[3] for b in prev)))

    for name, value in pairs:
        if name not in EXPECTED:
            continue
        want, tol = EXPECTED[name]
        checks.append(
            {
                "metric": name,
                "got": round(value, 1),
                "want": want,
                "tol": tol,
                "ok": abs(value - want) <= tol,
            }
        )
    out["checks"] = checks

    if truth_path and Path(truth_path).exists():
        truth = json.loads(Path(truth_path).read_text())
        surf = truth.get("banner" if mode == "banner" else "dialog", {})
        nodes = surf.get("nodes", [])
        by_sel = {}
        for n in nodes:
            by_sel.setdefault(n["sel"], n["box"])
        web = {}
        card_sel = "consent-banner-card" if mode == "banner" else "consent-dialog-card"
        tab_sel = "consent-banner-branding" if mode == "banner" else "consent-dialog-branding"
        if card_sel in by_sel:
            b = by_sel[card_sel]
            web["card_left_gap"] = round(b["x"], 1)
            web["card_right_gap"] = round(WEB_WIDTH - (b["x"] + b["w"]), 1)
            web["card_height"] = round(b["w"] and b["h"], 1)
            web["card_width"] = round(b["w"], 1)
        if tab_sel in by_sel:
            web["tab_width"] = round(by_sel[tab_sel]["w"], 1)
            web["tab_height"] = round(by_sel[tab_sel]["h"], 1)
        btn = [n["box"] for n in nodes if "button" in n["sel"]]
        if btn:
            web["button_height"] = round(sorted(b["h"] for b in btn)[0], 1)
            web["buttons"] = len(btn)
            xs = sorted(b["x"] for b in btn)
            tops = sorted({round(b["y"], 1) for b in btn})
            for t in tops:
                row = [b for b in btn if round(b["y"], 1) == t]
                if len(row) > 1:
                    row.sort(key=lambda b: b["x"])
                    web["button_column_gap"] = round(row[1]["x"] - (row[0]["x"] + row[0]["w"]), 1)
            if len(tops) > 1:
                web["action_row_gap"] = round(tops[1] - tops[0] - 35.5, 1)
        titles = [n for n in nodes if n["sel"].endswith("h3.title")]
        if titles:
            ys = sorted(t["box"]["y"] for t in titles)
            web["category_rows"] = len(titles)
            if len(ys) > 1:
                web["row_pitch"] = round(ys[1] - ys[0], 1)
        out["web_truth"] = web
        out["web_viewport_width"] = WEB_WIDTH

    out["result"] = "MATCH" if checks and all(c["ok"] for c in checks) else "DIFFERS"
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("screenshot")
    ap.add_argument("--mode", choices=["banner", "dialog"], default="banner")
    ap.add_argument("--scale", type=float, default=3.0)
    ap.add_argument("--truth", default="/tmp/ui-parity/truth/light.json")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    out = summarize(args.screenshot, args.mode, args.scale, args.truth)
    if args.json:
        print(json.dumps(out, indent=1))
        return 0 if out.get("result") == "MATCH" else (2 if not out.get("surface_found") else 1)

    print(f"screenshot {out['screenshot']}")
    print(
        f"screen {out['points'][0]}x{out['points'][1]} pt "
        f"({out['pixels'][0]}x{out['pixels'][1]} px @ {out['scale']}x)"
    )
    print(f"surface {out['mode']}  found {out['surface_found']}")
    if not out["surface_found"]:
        print("FAIL  " + out.get("error", "nothing found"))
        print("RESULT NOT MEASURED")
        return 2
    print(f"tab    x{out['tab'][0]} y{out['tab'][1]} w{out['tab'][2]} h{out['tab'][3]}")
    print(f"card   x{out['card'][0]} y{out['card'][1]} w{out['card'][2]} h{out['card'][3]}  (edges: {out['edge_method']})")
    print(
        f"gaps   left {out['card_left_gap']}  right {out['card_right_gap']}  "
        f"bottom {out['card_bottom_gap']}"
    )
    print(f"buttons {len(out['buttons'])} {out['buttons']}")
    if out.get("on_switch_rows"):
        print(f"on-switch row tops (pt) {out['on_switch_rows']}")
    web = out.get("web_truth") or {}
    if web:
        print("web truth  " + "  ".join(f"{k}={v}" for k, v in web.items()))
    for c in out["checks"]:
        print(
            f"{'PASS' if c['ok'] else 'FAIL'}  {c['metric']}: {c['got']} "
            f"(want {c['want']} +/-{c['tol']})"
        )
    print("RESULT", out["result"])
    return 0 if out["result"] == "MATCH" else 1


if __name__ == "__main__":
    sys.exit(main())
