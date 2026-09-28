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
    ios-surface-metrics.py <iab-drawer.png> --mode iab-drawer --scale 2 \
        --truth /tmp/ui-parity/truth/iab-light.json

Exit 0 when every measured metric is inside tolerance, 1 when one is not, and 2 when
the surface was not found at all, because "not measured" must never read as "passed".

--mode iab-drawer reads the full-page IAB disclosure instead, and finds it by a
different signal: there is no branding tab on a drawer, so its two anchors are the
segmented control and the footer, which are the sheet's only two bands painted a step
off the card. That reaches the card inset, the tab pair, the buttons and the footer.
It does not reach the rows: a page whose switches are all off is a field of identical
hairlines, and the script says so under NOT MEASURED instead of guessing at a divider.
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

# What the web IAB disclosure measures, in CSS px, with the selector each came from.
# Every figure is a `getBoundingClientRect()` read out of the live `examples/demo` app
# at 411 x 914, forced light, scenario `preset-europe-iab`, opened from
# `consent-banner-customize-button`; the boxes are kept in
# /tmp/ui-parity/truth/iab-light.json (purposes tab) and iab-light-vendors.json.
# The same table android-surface-metrics.py grades, so the two halves agree.
WEB_IAB = {
    "card_inset": 16.0,  # iab-consent-dialog-card x, and the right gap
    "tab_button": 170.5,  # button.tabButton w
    "tab_button_height": 32.0,  # button.tabButton h
    "tab_list_height": 40.0,  # div.tabsList h
    "purpose_row_height": 78.0,  # purpose-item-1 h, over a two-line name
    "vendor_row_height": 58.0,  # div.vendorListItem-* h, 168 rows of it
    "vendor_row_pitch": 64.0,  # consecutive div.vendorListItem-* tops
    "button_height": 35.5,  # button.button h
    "button_column_gap": 16.0,  # div.actionGroup column-gap
    "action_row_gap": 16.0,  # div.footer.actionRoot row-gap, not the dialog's 8
    "footer_height": 112.0,  # div.footer.actionRoot h, at no bottom band
}

# The drawer's own contract. Its card is a page and not a floating card, so the inset
# is zero on both sides: the web's 16.0 is `.root { padding: 16 }` around a centred
# dialog, which is the one thing this presentation exists to avoid. Everything else is
# the web's figure, read off the screenshot.
EXPECTED_IAB = {
    "card_left": (0.0, 2.0),
    "card_right_gap": (0.0, 2.0),
    "tab_height": (WEB_IAB["tab_button_height"], 2.0),
    "tab_list_height": (WEB_IAB["tab_list_height"], 2.0),
    "button_height": (WEB_IAB["button_height"], 2.5),
    "button_column_gap": (WEB_IAB["button_column_gap"], 2.5),
    "action_row_gap": (WEB_IAB["action_row_gap"], 2.5),
}

# Both the segmented control and the footer paint `--iab-cd-surface-hover`, one step
# off the card, and nothing else in the sheet does. That single fill is how a headless
# runner finds either of them: the pair is the sheet's only two raised bands.
RAISED_SPREAD = 8


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


def column_blue(f, x, y0, y1):
    """Fraction of a column that is tab blue across the tab's own height."""
    total = blue_count = 0
    for yy in range(int(y0), int(y1)):
        total += 1
        if blue(f.get(x, yy)):
            blue_count += 1
    return total > 0 and blue_count / total >= 0.5


def grow_past_glyphs(f, box):
    """Extend a tab run across the wordmark painted inside it.

    The row walk closes a run at the first non-blue pixel, and the tab carries white
    glyphs, so the run it reports stops inside the pill: measured that way the tab came
    out at 83.3pt against the web's 129.4, a FAIL on a surface that was actually 127.7
    and inside its own tolerance. A column through a glyph is still mostly the fill
    behind it, while a column past the pill is the page, so the fill fraction tells the
    two apart. Only the trailing edge grows: the run starts at the pill's own left edge.
    """
    x, y, w, h = box
    right = int(x + w)
    while right < f.w_px and column_blue(f, right, y, y + h):
        right += 1
    return (x, y, right - x, h)


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
    if best is None:
        return None
    return grow_past_glyphs(f, best[1])


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


def dominant_colour(f, x0=0, y0=0, x1=None, y1=None, stride=3):
    """The colour most of a region is painted in, sampled on a stride."""
    x1 = x1 if x1 is not None else f.w_px
    y1 = y1 if y1 is not None else f.h_px
    counts = {}
    for y in range(y0, y1, stride):
        for x in range(x0, x1, stride):
            c = f.get(x, y)
            for seen in counts:
                if dist(seen, c) <= 3:
                    counts[seen] += 1
                    break
            else:
                counts[c] = 1
    return max(counts, key=counts.get) if counts else None


def raised_extent(f, y, card_fill):
    """Where a row leaves the card's own fill, and what it is painted instead.

    The row is read in from both edges rather than walked across it: the active tab is
    painted back in the card's own colour, so the middle of a segmented control is
    card-coloured and a run walk would stop there. The first and last pixel that is
    not the card bounds the band either way, and the middle is settled by asking how
    much of what is inside matches the fill found at those two edges.
    """
    # The step being looked for is `#FAFAFA` on `#FFFFFF`: 8.7 in RobertIndex, and
    # lossless simulator output carries no noise near that size. Anything wider starts
    # calling the raised band part of the card.
    edge = 5
    left = next(
        (x for x in range(f.w_px) if dist(f.get(x, y), card_fill) > edge), None
    )
    right = next(
        (x for x in range(f.w_px - 1, -1, -1) if dist(f.get(x, y), card_fill) > edge),
        None,
    )
    if left is None or right is None or right - left < int(0.5 * f.w_px):
        return None
    inset = max(2, int(2 * f.scale))
    probes = [f.get(left + inset, y), f.get(right - inset, y)]
    fill = next((c for c in probes if dist(c, card_fill) > RAISED_SPREAD), None)
    if fill is None:
        return None
    if dist(fill, card_fill) <= max(edge, RAISED_SPREAD):
        return None
    inside = [f.get(x, y) for x in range(left, right + 1, 2)]
    matches = sum(1 for c in inside if dist(c, fill) <= RAISED_SPREAD)
    # Half a segmented control is the selected tab, painted back in the card's own
    # colour, so a band this wide is only ever painted raised across the other half.
    if not inside or matches / len(inside) < 0.45:
        return None
    return (left, right, fill)


def raised_bands(f, card_fill, y_lo, y_hi):
    """Contiguous y runs that carry a raised fill over most of their width."""
    step = max(1, int(f.scale) // 2 or 1)
    bands, cur = [], None
    for y in range(int(y_lo), int(y_hi)):
        seg = raised_extent(f, y, card_fill)
        if seg and cur and abs(seg[0] - cur[2]) <= int(3 * f.scale) and y - cur[1] <= 3:
            cur[1] = y
        else:
            if cur and y - cur[1] > int(4 * f.scale):
                bands.append(tuple(cur))
                cur = None
            if seg:
                cur = [y, y, seg[0], seg[1], seg[2]]
    if cur:
        bands.append(tuple(cur))
    return [b for b in bands if b[1] - b[0] >= int(14 * f.scale)]


def find_footer_band(f, card_fill):
    """The band the actions stand in, read up a column no button reaches.

    Scanning across it does not work: the buttons are punched out of the footer's own
    fill in the card's, so half of the band's rows are mostly card-coloured and a row
    walk calls them three separate bands. The footer keeps 16pt of its gutter clear on
    both sides, so a probe 6pt in sees nothing but the fill, from the physical bottom
    edge -- which the SDK's floor band is painted in too -- up to the rule on its top.
    """
    x = int(6 * f.scale)
    fill = f.get(x, f.h_px - int(2 * f.scale))
    if dist(fill, card_fill) <= RAISED_SPREAD:
        return None
    y = f.h_px - 1
    while y > 0 and dist(f.get(x, y), fill) <= RAISED_SPREAD:
        y -= 1
    top = y + 1
    for probe in (top + int(6 * f.scale), f.h_px - int(6 * f.scale)):
        xs = [i for i in range(f.w_px) if dist(f.get(i, probe), fill) <= RAISED_SPREAD]
        if len(xs) >= int(0.5 * f.w_px):
            return (top, f.h_px - 1, min(xs), max(xs), fill)
    return None


def band_boxes(f, band, card_fill):
    """Boxes of card fill inside a raised band: the buttons standing in the footer."""
    top, bottom, left, right, _ = band
    boxes = []
    for y in range(top, bottom + 1):
        start = None
        for x in range(left, right + 2):
            on = x <= right and dist(f.get(x, y), card_fill) <= 7
            if on and start is None:
                start = x
            elif not on and start is not None:
                if (x - start) / f.scale > 24:
                    hit = next(
                        (
                            b
                            for b in boxes
                            if b[4] >= y - 2 and not (x - 1 < b[1] or start > b[2])
                        ),
                        None,
                    )
                    if hit:
                        hit[1] = min(hit[1], start)
                        hit[2] = max(hit[2], x - 1)
                        hit[4] = y
                    else:
                        boxes.append([y, start, x - 1, start, y])
                start = None
    return [
        (b[1] / f.scale, b[0] / f.scale, (b[2] - b[1]) / f.scale, (b[4] - b[0]) / f.scale)
        for b in boxes
        if 16 <= (b[4] - b[0]) / f.scale <= 80
    ]


def web_iab_truth(truth_path):
    """The iab-panel boxes the web really rendered, reduced to what is graded here.

    The selectors in a truth file carry a build hash, so they are matched by the part
    that survives one. None means the file has no iab surface in it, which is reported
    rather than assumed away: the graded table is a capture of these numbers, and a
    reader has to be able to tell a fresh read from a remembered one.
    """
    if not truth_path or not Path(truth_path).exists():
        return None
    surface = json.loads(Path(truth_path).read_text()).get("iab")
    if not surface:
        return None
    nodes = surface["nodes"]

    def one(match):
        found = [n["box"] for n in nodes if match(n["sel"])]
        return found[0] if found else None

    web = {}
    card = one(lambda s: s == "iab-consent-dialog-card")
    if card:
        web["card_inset"] = round(card["x"], 1)
    tab = one(lambda s: s == "button.tabButton")
    if tab:
        web["tab_button"], web["tab_button_height"] = (
            round(tab["w"], 1),
            round(tab["h"], 1),
        )
    tabs = one(lambda s: s.endswith("tabsList"))
    if tabs:
        web["tab_list_height"] = round(tabs["h"], 1)
    row = one(lambda s: s == "purpose-item-1")
    if row:
        web["purpose_row_height"] = round(row["h"], 1)
    foot = one(lambda s: s.endswith("actionRoot"))
    if foot:
        web["footer_height"] = round(foot["h"], 1)
    buttons = [n["box"] for n in nodes if n["sel"] == "button.button"]
    if buttons:
        web["button_height"] = round(sorted(b["h"] for b in buttons)[0], 1)
        tops = sorted({round(b["y"], 1) for b in buttons})
        for t in tops:
            same = sorted((b for b in buttons if round(b["y"], 1) == t), key=lambda b: b["x"])
            if len(same) > 1:
                web["button_column_gap"] = round(same[1]["x"] - (same[0]["x"] + same[0]["w"]), 1)
        if len(tops) > 1:
            web["action_row_gap"] = round(tops[1] - tops[0] - web["button_height"], 1)
    return web or None


def summarize_iab(path, scale, truth_path):
    f = Frame(path, scale)
    # The sheet is full-bleed, so the card's own fill is the most common colour the
    # frame holds. Everything else here is measured against it.
    card_fill = dominant_colour(f)
    out = {
        "screenshot": str(path),
        "pixels": [f.w_px, f.h_px],
        "points": [round(f.w, 1), round(f.h, 1)],
        "scale": scale,
        "mode": "iab-drawer",
        "surface_found": False,
    }
    # The control is the first band painted a step off the card below the status bar,
    # with the header's plain copy above it. A drawer scrolled far enough to lose the
    # control reports "not found" rather than grading something else.
    tabs_px = (raised_bands(f, card_fill, 0.13 * f.h_px, 0.55 * f.h_px) or [None])[0]
    footer_px = find_footer_band(f, card_fill)
    missing = [
        name
        for name, band in (("segmented control", tabs_px), ("footer", footer_px))
        if band is None
    ]
    if missing:
        out["error"] = "no IAB drawer: no " + " and no ".join(missing) + " on screen"
        return out

    tabs = f.pt((tabs_px[2], tabs_px[0], tabs_px[3] - tabs_px[2], tabs_px[1] - tabs_px[0]))
    footer = f.pt(
        (footer_px[2], footer_px[0], footer_px[3] - footer_px[2], footer_px[1] - footer_px[0])
    )
    buttons = sorted(band_boxes(f, footer_px, card_fill), key=lambda b: (b[1], b[0]))
    card_left, card_right_gap = footer[0], round(f.w - (footer[0] + footer[2]), 1)
    out.update(
        {
            "surface_found": True,
            "card_fill": list(card_fill),
            "card_left_gap": card_left,
            "card_right_gap": card_right_gap,
            "tabs": [round(v, 1) for v in tabs],
            "footer": [round(v, 1) for v in footer],
            "buttons": [[round(v, 1) for v in b] for b in buttons],
        }
    )

    checks = []
    pairs = [
        ("card_left", card_left),
        ("card_right_gap", card_right_gap),
        ("tab_list_height", tabs[3]),
    ]
    # Only the selected tab is painted back in the card's colour, so the box inside the
    # control is the active one, and its height is the control's less its own padding.
    inner = band_boxes(f, tabs_px, card_fill)
    if inner:
        pairs += [("tab_height", max(b[3] for b in inner))]
    else:
        out["not_measured"] = ["tab_height: no tab is painted in the card's own fill"]
    for b in buttons:
        pairs.append(("button_height", b[3]))
    rows = {}
    for b in buttons:
        rows.setdefault(round(b[1] / 6), []).append(b)
    ordered = sorted(rows.values(), key=lambda g: min(b[1] for b in g))
    for group in ordered:
        group.sort(key=lambda b: b[0])
        for a, b in zip(group, group[1:]):
            pairs.append(("button_column_gap", b[0] - (a[0] + a[2])))
    for above, below in zip(ordered, ordered[1:]):
        pairs.append(
            ("action_row_gap", min(b[1] for b in below) - max(b[1] + b[3] for b in above))
        )

    for name, value in pairs:
        want, tol = EXPECTED_IAB[name]
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
    out.setdefault("not_measured", []).append(
        "row pitch and row height: a page of rows whose switches are all off is a "
        "field of near-identical hairlines, and reading a divider out of one is a "
        "guess. Android reads the same rows out of a view tree; measure them there."
    )
    out["not_measured"].append(
        "footer height: the band runs to the physical bottom edge through whichever "
        "floor the SDK laid out against, and a screenshot cannot say how tall that "
        "was. The web's 112 is graded once with the band read off the device, in "
        "android-surface-metrics.py --mode iab-drawer."
    )
    web = web_iab_truth(truth_path)
    if web:
        out["web_truth"] = web
        out["web_viewport_width"] = WEB_WIDTH
    else:
        out["web_truth_source"] = f"no iab surface in {truth_path}"
    out["result"] = "MATCH" if checks and all(c["ok"] for c in checks) else "DIFFERS"
    return out


def summarize(path, mode, scale, truth_path):
    if mode == "iab-drawer":
        return summarize_iab(path, scale, truth_path)
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
    ap.add_argument(
        "--mode", choices=["banner", "dialog", "iab-drawer"], default="banner"
    )
    ap.add_argument("--scale", type=float, default=3.0)
    ap.add_argument("--truth", default=None)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    # The iab figures live in a truth file of their own: they were captured from a
    # page that has no banner or dialog on it.
    truth = args.truth or (
        "/tmp/ui-parity/truth/iab-light.json"
        if args.mode == "iab-drawer"
        else "/tmp/ui-parity/truth/light.json"
    )
    out = summarize(args.screenshot, args.mode, args.scale, truth)
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
    if args.mode == "iab-drawer":
        print(
            f"tabs   x{out['tabs'][0]} y{out['tabs'][1]} w{out['tabs'][2]} h{out['tabs'][3]}"
        )
        print(
            f"footer x{out['footer'][0]} y{out['footer'][1]} w{out['footer'][2]} "
            f"h{out['footer'][3]}"
        )
        print(
            f"insets left {out['card_left_gap']}  right {out['card_right_gap']}   "
            "(0 is the drawer's own contract; the web's 16 is a centred dialog's gutter)"
        )
        print(f"buttons {out['buttons']}")
        for line in out.get("not_measured", []):
            print("NOT MEASURED  " + line)
        web = out.get("web_truth") or {}
        if web:
            print("web truth  " + "  ".join(f"{k}={v}" for k, v in web.items()))
        else:
            print("web truth  " + out.get("web_truth_source", "not read"))
        for c in out["checks"]:
            print(
                f"{'PASS' if c['ok'] else 'FAIL'}  {c['metric']}: {c['got']} "
                f"(want {c['want']} +/-{c['tol']})"
            )
        print("RESULT", out["result"])
        return 0 if out["result"] == "MATCH" else 1
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
