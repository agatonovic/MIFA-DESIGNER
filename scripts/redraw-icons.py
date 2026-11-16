"""Redraw every spreadsheet symbol as clean geometry.

Same symbol, same kind of shape, no words. One stroke weight, true circles,
and straight lines on a shared grid.
"""

import re
from pathlib import Path

OUT = Path("/Users/nikola/Laberator/packages/mifa-designer/src/symbol-art.ts")
INK = "#1a1a1a"
PAPER = "#ffffff"
SW = 2.2
CARS = ("#b0b6be", "#26c6da", "#c0ca33", "#66bb6a", "#ef5350")


def num(value):
    text = f"{value:.2f}".rstrip("0").rstrip(".")
    return text if text not in {"", "-0"} else "0"


class Icon:
    def __init__(self, width, height):
        self.width = width
        self.height = height
        self.paths = []

    def add(self, commands, fill=PAPER, stroke=INK, sw=SW):
        parts = []
        for command in commands:
            if command[0] == "Z":
                parts.append("Z")
            else:
                parts.append(command[0] + " " + " ".join(num(v) for v in command[1:]))
        self.paths.append({"d": "".join(parts), "fill": fill, "stroke": stroke, "width": sw if stroke else 0})
        return self

    def rect(self, x, y, w, h, fill=PAPER, stroke=INK):
        return self.add([("M", x, y), ("L", x + w, y), ("L", x + w, y + h), ("L", x, y + h), ("Z",)], fill, stroke)

    def oval(self, cx, cy, rx, ry, fill=PAPER, stroke=INK):
        k = 0.5522847498
        return self.add([
            ("M", cx + rx, cy),
            ("C", cx + rx, cy + k * ry, cx + k * rx, cy + ry, cx, cy + ry),
            ("C", cx - k * rx, cy + ry, cx - rx, cy + k * ry, cx - rx, cy),
            ("C", cx - rx, cy - k * ry, cx - k * rx, cy - ry, cx, cy - ry),
            ("C", cx + k * rx, cy - ry, cx + rx, cy - k * ry, cx + rx, cy),
            ("Z",),
        ], fill, stroke)

    def line(self, x1, y1, x2, y2, sw=SW):
        return self.add([("M", x1, y1), ("L", x2, y2)], None, INK, sw)

    def poly(self, points, fill=PAPER, stroke=INK):
        commands = [("M", *points[0])] + [("L", *point) for point in points[1:]] + [("Z",)]
        return self.add(commands, fill, stroke)

    def wheel(self, cx, cy, r=5):
        self.oval(cx, cy, r, r)
        self.oval(cx, cy, r * 0.35, r * 0.35, INK, INK)
        return self


def cross(icon, x, y, w, h, pad=None):
    pad = (min(w, h) * 0.22) if pad is None else pad
    icon.line(x + pad, y + pad, x + w - pad, y + h - pad)
    icon.line(x + w - pad, y + pad, x + pad, y + h - pad)


def arrow(icon, x, y, w, h, head=18):
    mid = y + h / 2
    icon.line(x, mid, x + w - head * 0.72, mid)
    icon.poly([(x + w - head, y), (x + w, mid), (x + w - head, y + h)], INK, INK)


def sawtooth(icon, x, y, w, h, teeth=6):
    step = w / teeth
    points = [(x, y + h)]
    for index in range(teeth):
        points.append((x + step * index + step * 0.5, y))
        points.append((x + step * (index + 1), y + h))
    icon.poly(points, None, INK)


def person(icon, cx, top, scale=1):
    icon.oval(cx, top + 7 * scale, 6.5 * scale, 6.5 * scale)
    icon.line(cx, top + 14 * scale, cx, top + 34 * scale)
    icon.line(cx, top + 18 * scale, cx - 12 * scale, top + 28 * scale)
    icon.line(cx, top + 18 * scale, cx + 12 * scale, top + 28 * scale)
    icon.line(cx, top + 34 * scale, cx - 9 * scale, top + 52 * scale)
    icon.line(cx, top + 34 * scale, cx + 9 * scale, top + 52 * scale)


def car(icon, x, y, color, w=26, h=12):
    icon.poly([
        (x + 2, y + h * 0.45),
        (x + w * 0.22, y + h * 0.45),
        (x + w * 0.34, y + h * 0.08),
        (x + w * 0.68, y + h * 0.08),
        (x + w * 0.78, y + h * 0.45),
        (x + w - 1, y + h * 0.45),
        (x + w - 1, y + h * 0.78),
        (x + 2, y + h * 0.78),
    ], color, INK)
    icon.rect(x + w * 0.38, y + h * 0.16, w * 0.22, h * 0.26, PAPER, INK)
    icon.oval(x + w * 0.28, y + h * 0.78, h * 0.22, h * 0.22)
    icon.oval(x + w * 0.74, y + h * 0.78, h * 0.22, h * 0.22)


def truck(icon, x, y, w=118, h=36):
    icon.rect(x, y, w * 0.62, h * 0.62)
    icon.poly([
        (x + w * 0.66, y + h * 0.22),
        (x + w * 0.78, y + h * 0.22),
        (x + w * 0.86, y + h * 0.42),
        (x + w * 0.98, y + h * 0.42),
        (x + w * 0.98, y + h * 0.68),
        (x + w * 0.64, y + h * 0.68),
        (x + w * 0.64, y + h * 0.28),
    ])
    for center in (0.12, 0.28, 0.5, 0.86):
        icon.wheel(x + w * center, y + h * 0.78, h * 0.18)


def forklift(icon, x, y, w=78, h=40, box=None):
    icon.rect(x + w * 0.06, y + h * 0.28, w * 0.4, h * 0.4)
    icon.rect(x + w * 0.24, y + h * 0.06, w * 0.2, h * 0.28)
    icon.line(x + w * 0.48, y + h * 0.06, x + w * 0.48, y + h * 0.74)
    icon.line(x + w * 0.48, y + h * 0.56, x + w * 0.9, y + h * 0.56)
    icon.line(x + w * 0.48, y + h * 0.7, x + w * 0.84, y + h * 0.7)
    icon.wheel(x + w * 0.18, y + h * 0.76, h * 0.15)
    icon.wheel(x + w * 0.38, y + h * 0.76, h * 0.15)
    if box == "full":
        icon.rect(x + w * 0.56, y + h * 0.22, w * 0.26, h * 0.32, "#8ecae6", INK)
    elif box == "empty":
        icon.rect(x + w * 0.56, y + h * 0.22, w * 0.26, h * 0.32)
        cross(icon, x + w * 0.56, y + h * 0.22, w * 0.26, h * 0.32)


def shelf_cart(icon, x, y, w=28, h=36):
    icon.rect(x, y, w, h * 0.72)
    icon.line(x, y + h * 0.28, x + w, y + h * 0.28)
    icon.line(x, y + h * 0.5, x + w, y + h * 0.5)
    icon.wheel(x + w * 0.25, y + h * 0.86, h * 0.12)
    icon.wheel(x + w * 0.75, y + h * 0.86, h * 0.12)


def flat_cart(icon, x, y, w=30, h=22):
    icon.rect(x, y, w, h * 0.45)
    icon.wheel(x + w * 0.22, y + h * 0.7, h * 0.22)
    icon.wheel(x + w * 0.78, y + h * 0.7, h * 0.22)


def agc(icon, x, y, w=36, h=22):
    icon.rect(x + 4, y, w - 8, h * 0.62)
    icon.rect(x + w * 0.35, y + h * 0.16, w * 0.22, h * 0.22)
    icon.wheel(x + w * 0.28, y + h * 0.78, h * 0.2)
    icon.wheel(x + w * 0.72, y + h * 0.78, h * 0.2)


def tugger(icon, x, y):
    icon.line(x, y + 18, x + 8, y + 18)
    icon.rect(x + 8, y + 8, 28, 18)
    icon.oval(x + 30, y + 6, 7, 7)
    icon.wheel(x + 16, y + 32, 5)
    icon.wheel(x + 30, y + 32, 5)


def hatch_triangle(icon, x, y, w, h, rows=5):
    icon.poly([(x + w / 2, y), (x + w, y + h), (x, y + h)])
    for index in range(1, rows + 1):
        yy = y + h * index / (rows + 1)
        t = (yy - y) / h
        half = (w / 2) * t
        icon.line(x + w / 2 - half + 3, yy, x + w / 2 + half - 3, yy, 1.4)


def clipboard(icon, x, y, w=36, h=48):
    icon.rect(x, y + 6, w, h - 6)
    icon.rect(x + w * 0.28, y, w * 0.44, 10)
    for step in (0.32, 0.5, 0.68):
        icon.line(x + 8, y + h * step, x + w - 8, y + h * step, 1.6)


def gantt(icon, rows, x=8, y=10, w=124, h=52):
    icon.line(x, y, x, y + h)
    icon.line(x, y + h, x + w, y + h)
    gap = h / (len(rows) + 1)
    for index, (start, length) in enumerate(rows):
        yy = y + gap * (index + 0.35)
        icon.rect(x + w * start, yy, w * length, gap * 0.45)


def build():
    icons = {}

    def put(key, icon):
        icons[key] = icon

    factory = Icon(120, 78)
    sawtooth(factory, 14, 8, 92, 22, 6)
    factory.rect(14, 30, 92, 40)
    put("process-supplier", factory)

    area = Icon(120, 72)
    area.rect(8, 10, 104, 52)
    area.rect(48, 22, 52, 28)
    put("process-logistics-area", area)

    for key in ("process-operation-with-added-value", "process-process"):
        mark = Icon(72, 72)
        mark.oval(36, 36, 24, 24)
        put(key, mark)
    assembly = Icon(72, 72)
    assembly.oval(36, 36, 24, 24)
    assembly.oval(36, 36, 8, 8)
    put("process-assembly-operation", assembly)

    check = Icon(72, 72)
    check.rect(14, 14, 44, 44)
    put("process-control-check", check)

    wait = Icon(72, 68)
    wait.poly([(36, 58), (10, 12), (62, 12)])
    put("process-wait", wait)

    prep = Icon(64, 84)
    prep.rect(8, 8, 48, 18)
    prep.rect(12, 32, 40, 18)
    prep.rect(16, 56, 32, 18)
    put("process-truck-preparation-area", prep)
    put("inventories-truck-preparation-area", prep)

    worker = Icon(64, 84)
    person(worker, 30, 8, 1.15)
    put("process-operator", worker)

    batches = Icon(148, 104)
    batches.line(74, 6, 74, 98, 3)
    for index, color in enumerate(CARS[:3]):
        car(batches, 4 + index * 22, 16, color, 20, 14)
        car(batches, 4 + index * 22, 64, color, 20, 14)
    for index, color in enumerate(CARS[3:]):
        car(batches, 86 + index * 28, 16, color, 24, 14)
        car(batches, 86 + index * 28, 64, color, 24, 14)
    put("process-production-line-in-batches", batches)

    sequence = Icon(56, 168)
    sequence.line(8, 6, 8, 162, 3)
    for index, color in enumerate(CARS):
        car(sequence, 16, 10 + index * 30, color, 32, 16)
    put("process-production-line-in-sequences", sequence)

    mound = Icon(120, 72)
    hatch_triangle(mound, 10, 10, 100, 52, 5)
    put("inventories-uncontrolled-inventory", mound)
    other = Icon(90, 68)
    hatch_triangle(other, 8, 8, 74, 52, 4)
    put("inventories-inventory-rother", other)

    controlled = Icon(110, 72)
    controlled.rect(10, 10, 90, 52)
    for yy in (26, 40):
        controlled.line(10, yy, 100, yy)
    put("inventories-controlled-inventory", controlled)

    conveyor = Icon(120, 80)
    hatch_triangle(conveyor, 16, 6, 88, 40, 4)
    conveyor.rect(8, 52, 104, 16)
    conveyor.line(8, 60, 112, 60, 1.4)
    put("inventories-uncontrolled-inventory-conveyor", conveyor)

    sequenced = Icon(120, 64)
    for index in range(4):
        sequenced.rect(8 + index * 28, 12, 22, 40)
        sequenced.oval(19 + index * 28, 26, 3, 3, INK, INK)
    put("inventories-storage-in-sequences-or-sequenced-inventory", sequenced)

    dock = Icon(132, 72)
    for index in range(3):
        dock.rect(8, 10 + index * 18, 28, 14)
        dock.rect(96, 10 + index * 18, 28, 14)
    arrow(dock, 44, 28, 44, 16, 12)
    put("inventories-crossdok", dock)

    def box_grid(empty):
        board = Icon(116, 84)
        board.rect(6, 6, 104, 72)
        for row in range(3):
            for col in range(4):
                board.rect(14 + col * 24, 14 + row * 20, 18, 14)
                if empty:
                    cross(board, 14 + col * 24, 14 + row * 20, 18, 14, 3)
        return board
    put("inventories-controlled-inventory-small-boxes-full", box_grid(False))
    put("inventories-controlled-inventory-small-boxes-empty", box_grid(True))

    fifo = Icon(140, 36)
    fifo.poly([(8, 8), (108, 8), (108, 4), (132, 18), (108, 32), (108, 28), (8, 28)])
    put("inventories-fifo-lanas", fifo)
    detail = Icon(140, 40)
    detail.rect(8, 10, 100, 20)
    for x in (32, 56, 80):
        detail.line(x, 10, x, 30)
    arrow(detail, 112, 8, 22, 24, 10)
    put("inventories-fifo-detail", detail)

    split = Icon(120, 64)
    split.rect(8, 18, 28, 28)
    arrow(split, 40, 24, 28, 16, 10)
    split.rect(74, 8, 28, 18)
    split.rect(74, 38, 28, 18)
    put("inventories-cross-docking", split)

    yard = Icon(150, 72)
    for row, y in enumerate((8, 40)):
        for index in range(6):
            x = 8 + index * 22
            yard.poly([(x, y + 22), (x + 8, y), (x + 26, y), (x + 18, y + 22)])
    put("inventories-trailer-yard", yard)

    safety = Icon(80, 68)
    safety.poly([(40, 8), (72, 58), (8, 58)])
    put("inventories-sometimes-used-for-safety-stock", safety)
    blocked = Icon(80, 68)
    blocked.poly([(40, 8), (72, 58), (8, 58)])
    cross(blocked, 24, 28, 32, 26, 4)
    put("inventories-another-version-of-the-safety-stock-using-a-similar-triangle-as-above-similar-icons-with-an-x-instead-of-an-s-are-also-sometimes-used-as-a-blocked-stock-that-cannot-be-used", blocked)

    full = Icon(84, 56)
    full.rect(8, 8, 68, 40)
    put("inventories-big-contailner-or-large-volume-full", full)
    empty = Icon(84, 56)
    empty.rect(8, 8, 68, 40)
    cross(empty, 8, 8, 68, 40)
    put("inventories-big-contailner-or-large-volume-empty", empty)
    def pallet(empty):
        board = Icon(80, 58)
        board.rect(20, 2, 40, 22)
        if empty:
            cross(board, 20, 2, 40, 22)
        board.rect(6, 26, 68, 5)
        board.rect(6, 46, 68, 5)
        for block in (10, 34, 58):
            board.rect(block, 31, 12, 15)
        return board
    put("inventories-small-boxes-pallet-full", pallet(False))
    put("inventories-small-boxes-pallet-empty", pallet(True))

    pair = Icon(150, 64)
    pair.rect(8, 12, 36, 40)
    pair.rect(52, 12, 36, 40)
    cross(pair, 52, 12, 36, 40)
    pair.rect(104, 12, 36, 40)
    put("inventories-controlled-inventory-big-containers-full-empty", pair)

    def cross_board(columns, times=False):
        board = Icon(150, 84)
        board.rect(6, 6, 138, 72)
        width = 120 / columns
        for col in range(columns):
            board.rect(16 + col * width, 16, width - 8, 44)
        if times:
            board.line(16, 68, 134, 68, 1.6)
            for col in range(columns + 1):
                board.line(16 + col * width, 64, 16 + col * width, 72, 1.6)
        return board
    put("inventories-sb-cross-dock", cross_board(4))
    put("inventories-sb-cross-dock-2", cross_board(4, True))
    put("inventories-sb-cross-dock-3", cross_board(3))
    put("inventories-sb-cross-dock-2-2", cross_board(5))
    put("inventories-sb-cross-dock-3-2", cross_board(5, True))

    flow = Icon(140, 28)
    arrow(flow, 8, 4, 124, 20, 16)
    put("material-material-flow", flow)
    push = Icon(146, 40)
    push.poly([(8, 10), (104, 10), (104, 4), (136, 20), (104, 36), (104, 30), (8, 30)])
    for index in range(4):
        push.rect(16 + index * 20, 15, 12, 10)
    put("material-push-flow", push)
    ship_arrow = Icon(146, 40)
    ship_arrow.poly([(8, 12), (100, 12), (100, 4), (136, 20), (100, 36), (100, 28), (8, 28)])
    put("material-shipment-transport-to-the-customer-or-from-the-supplier", ship_arrow)
    ball = Icon(56, 56)
    ball.oval(28, 28, 16, 16)
    put("material-sequenced-pull-ball", ball)
    pull = Icon(120, 56)
    pull.rect(8, 10, 40, 36)
    pull.line(8, 22, 48, 22)
    pull.line(8, 34, 48, 34)
    arrow(pull, 56, 16, 56, 24, 14)
    put("material-pull-system-and-is-usually-found-after-a-supermarket", pull)
    fifo_move = Icon(146, 36)
    fifo_move.poly([(8, 8), (28, 18), (8, 28)])
    fifo_move.poly([(36, 8), (56, 18), (36, 28)], None, INK)
    arrow(fifo_move, 64, 6, 74, 24, 14)
    put("material-fifo-transfert", fifo_move)
    sils = Icon(140, 24)
    sils.rect(8, 4, 124, 16)
    put("material-sils-transfert", sils)

    boat = Icon(100, 60)
    boat.poly([(14, 36), (86, 36), (74, 50), (26, 50)])
    boat.line(42, 36, 42, 8)
    boat.poly([(42, 10), (70, 34), (42, 34)])
    put("material-tranfert-by-boat", boat)
    vessel = Icon(140, 56)
    vessel.poly([(10, 30), (130, 30), (116, 46), (24, 46)])
    vessel.rect(28, 14, 22, 16)
    vessel.rect(54, 10, 22, 20)
    vessel.rect(80, 14, 22, 16)
    put("material-transfert-by-transcontainer-ship", vessel)
    move = Icon(140, 60)
    move.poly([(6, 36), (50, 36), (44, 48), (12, 48)])
    move.poly([(90, 36), (134, 36), (128, 48), (96, 48)])
    move.rect(58, 14, 24, 18)
    arrow(move, 34, 8, 28, 14, 10)
    put("material-transshipment", move)
    plane = Icon(148, 52)
    plane.poly([(18, 26), (78, 20), (118, 20), (132, 26), (118, 32), (78, 32)])
    plane.poly([(70, 22), (96, 6), (104, 6), (86, 22)])
    plane.poly([(70, 30), (96, 46), (104, 46), (86, 30)])
    plane.poly([(24, 22), (40, 10), (46, 10), (36, 22)])
    put("material-transfert-by-plane", plane)

    box_truck = Icon(148, 56)
    truck(box_truck, 16, 8, 116, 40)
    put("material-transfert-by-transcontainer-truck", box_truck)
    put("materials-truck-transfer", box_truck)
    loco = Icon(156, 58)
    loco.rect(8, 16, 52, 24)
    for x in (14, 26, 38):
        loco.line(x, 16, x, 40, 1.2)
    loco.rect(66, 12, 22, 28)
    loco.poly([(92, 20), (140, 20), (146, 32), (140, 40), (92, 40)])
    for x in (20, 40, 74, 108, 128):
        loco.wheel(x, 46, 5)
    loco.line(6, 40, 150, 40, 1.4)
    put("material-rail-transfert", loco)
    lift_box = Icon(140, 56)
    forklift(lift_box, 8, 6, 84, 44, "full")
    put("material-transfert-by-transcontainer-forklift", lift_box)

    jack = Icon(124, 74)
    person(jack, 24, 6, 0.95)
    jack.rect(58, 34, 52, 12)
    jack.rect(52, 46, 64, 5)
    jack.wheel(66, 58, 5)
    jack.wheel(104, 58, 5)
    jack.line(58, 34, 34, 28)
    put("material-manual-transfert-pallet-jack", jack)
    table = Icon(100, 68)
    table.rect(16, 10, 68, 12)
    table.line(28, 22, 72, 48)
    table.line(72, 22, 28, 48)
    table.rect(12, 48, 76, 8)
    put("material-manual-transfert-lifting-table", table)

    walker = Icon(100, 86)
    person(walker, 50, 4, 0.9)
    walker.line(8, 74, 84, 74)
    walker.poly([(84, 68), (98, 74), (84, 80)], None, INK)
    put("materials-man-transfer", walker)
    lift = Icon(110, 56)
    forklift(lift, 8, 4, 90, 46)
    put("materials-forklift-transfer", lift)

    train = Icon(168, 64)
    shelf_cart(train, 6, 10, 36, 46)
    shelf_cart(train, 52, 10, 36, 46)
    tugger(train, 118, 14)
    train.line(42, 32, 52, 32)
    train.line(88, 32, 118, 32)
    put("materials-tugger-train-transfer-shelf-carts", train)
    carts = Icon(168, 56)
    flat_cart(carts, 6, 16, 36, 28)
    flat_cart(carts, 52, 16, 36, 28)
    tugger(carts, 118, 8)
    carts.line(42, 28, 52, 28)
    carts.line(88, 28, 118, 28)
    put("materials-tugger-cart-transfer-br-ro-ro", carts)
    push_cart = Icon(80, 64)
    push_cart.rect(8, 28, 48, 16)
    push_cart.line(56, 28, 56, 8)
    push_cart.line(56, 8, 72, 8)
    push_cart.wheel(20, 52, 6)
    push_cart.wheel(44, 52, 6)
    put("materials-push-cart-transfer", push_cart)
    seq_cart = Icon(80, 70)
    seq_cart.rect(12, 8, 44, 40)
    seq_cart.line(12, 21, 56, 21)
    seq_cart.line(12, 34, 56, 34)
    seq_cart.line(56, 20, 70, 8)
    seq_cart.wheel(24, 58, 6)
    seq_cart.wheel(48, 58, 6)
    put("materials-sequenced-cart-transfer", seq_cart)
    one = Icon(64, 40)
    agc(one, 8, 4, 48, 30)
    put("materials-agc-transfer", one)

    both = Icon(168, 64)
    forklift(both, 4, 4, 70, 36, "full")
    forklift(both, 88, 28, 70, 32, "empty")
    put("material-big-container-delivered-by-forklift-full-empty", both)
    full_sb = Icon(110, 56)
    forklift(full_sb, 6, 6, 86, 44, "full")
    put("materials-forklift-sb-full", full_sb)
    empty_sb = Icon(110, 56)
    forklift(empty_sb, 6, 6, 86, 44, "empty")
    put("materials-forklift-sb-empty", empty_sb)

    tug_lv = Icon(168, 64)
    shelf_cart(tug_lv, 6, 8, 36, 48)
    tug_lv.rect(12, 16, 24, 16, "#8ecae6", INK)
    shelf_cart(tug_lv, 52, 8, 36, 48)
    tug_lv.rect(58, 16, 24, 16)
    cross(tug_lv, 58, 16, 24, 16, 4)
    tugger(tug_lv, 118, 12)
    tug_lv.line(42, 30, 52, 30)
    tug_lv.line(88, 30, 118, 30)
    put("material-big-container-delivered-by-tuggaer-cart-full-empty", tug_lv)
    flats = Icon(168, 52)
    flat_cart(flats, 6, 12, 36, 28)
    flat_cart(flats, 52, 12, 36, 28)
    cross(flats, 52, 12, 36, 14, 4)
    tugger(flats, 118, 6)
    flats.line(42, 24, 52, 24)
    flats.line(88, 24, 118, 24)
    put("material-small-boxes-delivered-by-flat-carts-full-empty", flats)
    shelves = Icon(168, 64)
    shelf_cart(shelves, 4, 8, 30, 48)
    shelf_cart(shelves, 40, 8, 30, 48)
    cross(shelves, 45, 16, 20, 16, 3)
    shelf_cart(shelves, 76, 8, 30, 48)
    tugger(shelves, 122, 12)
    shelves.line(34, 30, 40, 30)
    shelves.line(70, 30, 76, 30)
    shelves.line(106, 30, 122, 30)
    put("material-small-boxes-delivered-by-shelf-carts-full-empty", shelves)
    trailer = Icon(140, 52)
    trailer.rect(16, 8, 108, 26)
    trailer.wheel(40, 40, 6)
    trailer.wheel(70, 40, 6)
    trailer.wheel(100, 40, 6)
    trailer.line(8, 20, 16, 20)
    put("material-trailer", trailer)
    convoy = Icon(168, 44)
    for index in range(3):
        agc(convoy, 8 + index * 52, 4, 44, 34)
        if index:
            convoy.line(8 + index * 52 - 8, 20, 8 + index * 52, 20)
    put("material-agc-convoy-delivery", convoy)

    info = Icon(140, 36)
    info.line(8, 24, 28, 8)
    info.line(28, 8, 52, 24)
    info.line(52, 24, 76, 8)
    info.line(76, 8, 100, 24)
    info.poly([(100, 14), (132, 24), (100, 34)], INK, INK)
    put("information-information-flow", info)
    oral = Icon(140, 48)
    oral.oval(24, 20, 14, 10)
    oral.poly([(32, 26), (42, 34), (30, 28)], PAPER, INK)
    arrow(oral, 52, 12, 76, 20, 14)
    put("information-oral-information-flow", oral)
    eye = Icon(120, 48)
    eye.add([
        ("M", 8, 24),
        ("C", 32, 6, 88, 6, 112, 24),
        ("C", 88, 42, 32, 42, 8, 24),
        ("Z",),
    ])
    eye.oval(60, 24, 12, 12)
    eye.oval(60, 24, 4, 4, INK, INK)
    put("information-visual-information-flow", eye)
    paper = Icon(100, 64)
    paper.poly([(18, 6), (62, 6), (74, 18), (74, 58), (18, 58)])
    paper.poly([(62, 6), (62, 18), (74, 18)], None, INK)
    for yy in (28, 36, 44):
        paper.line(26, yy, 64, yy, 1.4)
    put("information-information-flow-based-on-paper", paper)
    mail = Icon(110, 64)
    mail.rect(12, 16, 86, 40)
    mail.poly([(12, 16), (55, 40), (98, 16)], None, INK)
    put("information-information-flow-by-mail", mail)
    board = Icon(110, 72)
    board.rect(8, 8, 94, 56)
    for x in (32, 56, 80):
        board.line(x, 8, x, 64)
    for y in (26, 44):
        board.line(8, y, 102, y)
    put("information-smoothing-panel-heijunka", board)
    card = Icon(56, 72)
    card.poly([(8, 8), (36, 8), (48, 20), (48, 64), (8, 64)])
    card.line(36, 8, 36, 20)
    card.line(36, 20, 48, 20)
    put("information-picking-kanban-card-withdrawal-kanban", card)
    prod = Icon(56, 72)
    prod.rect(8, 8, 40, 56)
    prod.rect(14, 14, 28, 44)
    put("information-production-kanban-card-production-in-kanban", prod)
    tray = Icon(88, 60)
    tray.rect(10, 22, 48, 28)
    tray.poly([(10, 22), (24, 8), (78, 8), (64, 22)])
    tray.poly([(64, 22), (78, 8), (78, 36), (64, 50)])
    put("information-box-for-kanban-card", tray)
    bolt = Icon(120, 44)
    bolt.line(6, 22, 34, 22)
    bolt.poly([(40, 6), (30, 22), (40, 22), (32, 38), (58, 16), (46, 16)], INK, INK)
    bolt.line(56, 22, 114, 22)
    put("information-electronic-information-flow", bolt)
    system = Icon(100, 68)
    system.rect(12, 4, 76, 46)
    system.rect(42, 50, 16, 6)
    system.rect(28, 56, 44, 6)
    put("information-information-flow-from-it-system-xx", system)
    printer = Icon(100, 68)
    printer.rect(18, 16, 64, 28)
    printer.rect(30, 4, 40, 14)
    printer.rect(28, 40, 44, 16)
    put("information-information-flow-using-a-printer", printer)

    customer = Icon(100, 64)
    customer.rect(16, 12, 68, 40)
    customer.oval(50, 28, 8, 8)
    put("specifics-customer-x", customer)
    put("specifics-supplier-y", factory)
    buyer = Icon(120, 48)
    car(buyer, 16, 10, PAPER, 88, 28)
    put("specifics-vehicle-purchase-customer", buyer)
    repair = Icon(120, 56)
    car(repair, 8, 16, PAPER, 70, 26)
    repair.line(88, 14, 104, 40)
    repair.line(104, 14, 88, 40)
    put("specifics-vehicle-repair-customer", repair)
    repair2 = Icon(120, 56)
    car(repair2, 16, 18, PAPER, 80, 26)
    repair2.line(36, 18, 56, 8)
    put("specifics-vehicle-repair-customer-2", repair2)
    recover = Icon(130, 52)
    car(recover, 8, 14, PAPER, 70, 26)
    arrow(recover, 86, 16, 36, 18, 12)
    put("specifics-vehicle-recovery-customer", recover)
    board_a = Icon(64, 80)
    clipboard(board_a, 12, 8, 40, 64)
    put("specifics-checklist-or-standard", board_a)
    put("specif-design-checklist-or-standard", board_a)
    loop = Icon(88, 72)
    loop.rect(8, 12, 40, 50)
    loop.line(16, 28, 40, 28, 1.6)
    loop.line(16, 38, 40, 38, 1.6)
    loop.line(16, 48, 34, 48, 1.6)
    loop.add([("M", 52, 22), ("C", 78, 22, 78, 58, 52, 58)], None, INK)
    loop.poly([(52, 50), (52, 66), (40, 56)], INK, INK)
    put("specifics-formalized-feedback-lessons-learned", loop)
    put("specif-design-formalized-feedback-lessons-learned", loop)

    iteration = Icon(80, 80)
    iteration.oval(40, 40, 22, 22, None, INK)
    iteration.poly([(56, 16), (70, 26), (52, 30)], INK, INK)
    iteration.poly([(24, 64), (10, 54), (28, 50)], INK, INK)
    put("specif-design-iteration-n-times", iteration)
    milestone = Icon(72, 72)
    milestone.poly([(36, 6), (66, 36), (36, 66), (6, 36)])
    put("specif-design-passage-of-milestone-j", milestone)
    sets = Icon(110, 64)
    sets.oval(40, 32, 24, 24, None, INK)
    sets.oval(58, 32, 24, 24, None, INK)
    sets.oval(49, 46, 24, 18, None, INK)
    put("specif-design-set-based", sets)
    pull_f = Icon(120, 36)
    arrow(pull_f, 8, 6, 104, 24, 16)
    put("specif-design-pull-flows", pull_f)
    push_f = Icon(120, 36)
    push_f.poly([(8, 10), (84, 10), (84, 4), (112, 18), (84, 32), (84, 26), (8, 26)])
    put("specif-design-push-flows", push_f)
    delay = Icon(80, 80)
    delay.rect(8, 8, 64, 64)
    delay.oval(40, 44, 16, 16, None, INK)
    delay.line(40, 44, 40, 34)
    delay.line(40, 44, 48, 48)
    put("specif-design-delay-with-i-c-for-lack-of-capacity-i-d-for-missing-data-i-v-for-control-late-validation-i-o-for-organization-or-milestone-not-passed", delay)
    meet = Icon(120, 64)
    meet.oval(60, 40, 40, 14)
    for cx in (28, 60, 92):
        meet.oval(cx, 18, 7, 7)
    put("specif-design-work-meeting-with-deliverables-agendad-number-of-people-expected-duration-out-of-milestone", meet)
    decision = Icon(80, 72)
    decision.poly([(40, 6), (74, 36), (40, 66), (6, 36)])
    decision.oval(40, 36, 6, 6, INK, INK)
    put("specif-design-decision-meeting-excluding-milestone", decision)
    fine = Icon(140, 64)
    gantt(fine, [(0.05, 0.35), (0.3, 0.4), (0.55, 0.3), (0.2, 0.5)])
    put("specif-design-fine-time-planning", fine)
    retro = Icon(150, 72)
    gantt(retro, [(0.4, 0.5), (0.55, 0.35), (0.7, 0.22), (0.5, 0.4)], 8, 8, 134, 56)
    retro.line(96, 8, 96, 64, 1.4)
    put("specif-design-retroplanning-with-detailed-planning-horizon-at-the-end-of-the-period", retro)
    return icons


def js(value):
    if value is None:
        return "null"
    return "'" + str(value).replace("\\", "\\\\").replace("'", "\\'") + "'"


def main():
    source = OUT.read_text()
    items = re.findall(r"id: '([^']+)',\n    name: '([^']+)',\n    folder: '([^']+)'", source)
    icons = build()
    missing = [item[0] for item in items if item[0] not in icons]
    extra = sorted(set(icons) - {item[0] for item in items})
    if missing or extra:
        raise SystemExit(f"missing {missing} extra {extra}")
    lines = [
        "/** Clean geometry for every symbol in the spreadsheet. No words inside the icons. */",
        "export type ArtPath = { d: string; fill: string | null; stroke: string | null; width: number };",
        "export type ArtImage = { href: string; x: number; y: number; width: number; height: number };",
        "export type ArtLabel = { text: string; x: number; y: number; size: number };",
        "export type SymbolArt = { id: string; name: string; folder: string; width: number; height: number; paths: ArtPath[]; images?: ArtImage[]; labels?: ArtLabel[] };",
        "",
        "export const SYMBOL_ART: SymbolArt[] = [",
    ]
    for symbol_id, name, folder in items:
        icon = icons[symbol_id]
        lines.append("  {")
        lines.append(f"    id: {js(symbol_id)},")
        lines.append(f"    name: {js(name)},")
        lines.append(f"    folder: {js(folder)},")
        lines.append(f"    width: {icon.width},")
        lines.append(f"    height: {icon.height},")
        lines.append("    paths: [")
        for path in icon.paths:
            lines.append(f"      {{ d: {js(path['d'])}, fill: {js(path['fill'])}, stroke: {js(path['stroke'])}, width: {path['width']} }},")
        lines.append("    ],")
        lines.append("  },")
    lines += [
        "];",
        "",
        "export const ART_BY_ID: Record<string, SymbolArt> = Object.fromEntries(SYMBOL_ART.map((art) => [art.id, art]));",
        "",
        "const TRANSPORT_ART: { test: RegExp; id: string }[] = [",
        "  { test: /forklift\\s*sb\\s*empty/i, id: 'materials-forklift-sb-empty' },",
        "  { test: /forklift\\s*sb\\s*full/i, id: 'materials-forklift-sb-full' },",
        "  { test: /tugger\\s*cart|ro-?ro|\\bbr\\b/i, id: 'materials-tugger-cart-transfer-br-ro-ro' },",
        "  { test: /tugger/i, id: 'materials-tugger-train-transfer-shelf-carts' },",
        "  { test: /sequenc/i, id: 'materials-sequenced-cart-transfer' },",
        "  { test: /forklift|cariste/i, id: 'materials-forklift-transfer' },",
        "  { test: /push\\s*cart|\\bcart\\b|chariot/i, id: 'materials-push-cart-transfer' },",
        "  { test: /\\bagc\\b|\\bagv\\b/i, id: 'materials-agc-transfer' },",
        "  { test: /\\bmanual\\b|\\bman\\b|manuel/i, id: 'materials-man-transfer' },",
        "  { test: /truck|camion/i, id: 'materials-truck-transfer' },",
        "];",
        "",
        "/** Drawing for a transport word typed in the flow register, such as Truck or Forklift. */",
        "export function transportArtwork(label: string) {",
        "  const word = label.trim();",
        "  const match = TRANSPORT_ART.find((item) => item.test.test(word));",
        "  return match ? ART_BY_ID[match.id] : undefined;",
        "}",
        "",
        "export function artBox(art: SymbolArt) {",
        "  let scale = 132 / Math.max(art.width, art.height);",
        "  if (Math.min(art.width, art.height) * scale < 28) scale = 28 / Math.min(art.width, art.height);",
        "  return { width: Math.round(art.width * scale), height: Math.round(art.height * scale) };",
        "}",
        "",
    ]
    OUT.write_text("\n".join(lines))
    print(f"redrew {len(items)} symbols, no labels")


if __name__ == "__main__":
    main()
