"""Build the Symbols tab from the MIFA spreadsheet drawings.

Words painted inside the drawings are left out. The shapes stay the
spreadsheet shapes.


The folders are the workbook sheets. Example plants and the leftover ZZ
sheet are not part of the symbol catalogue.
"""

import math
import re
import shutil
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path("/tmp/mifa-xlsx")
OUT = Path("/Users/nikola/Laberator/packages/mifa-designer/src/symbol-art.ts")
PUBLIC = Path("/Users/nikola/Laberator/packages/mifa-designer/public/symbols")

A = "http://schemas.openxmlformats.org/drawingml/2006/main"
XDR = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
P = "http://schemas.openxmlformats.org/package/2006/relationships"
M = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS = {"a": A, "xdr": XDR, "m": M}

SHEETS = [
    ("sheet1", "drawing1", "Process"),
    ("sheet2", "drawing2", "Inventories"),
    ("sheet3", "drawing3", "Material"),
    ("sheet4", "drawing4", "Information"),
    ("sheet5", "drawing5", "Others"),
    ("sheet6", "drawing6", "SPECIFICS"),
    ("sheet7", "drawing7", "SPECIF_DESIGN"),
]

# Keep the ids already stored on sheets and used by the line icons.
STABLE = {
    ("process", "supplier"): "process-supplier",
    ("process", "production line in batches"): "process-production-line-in-batches",
    ("process", "production line in sequences"): "process-production-line-in-sequences",
    ("material", "transfert by truck"): "materials-truck-transfer",
    ("material", "transfert by forklift"): "materials-forklift-transfer",
    ("material", "man handled transfert"): "materials-man-transfer",
    ("material", "transfert by tugger train shelf carts"): "materials-tugger-train-transfer-shelf-carts",
    ("material", "transfert by tugger cart br ro ro"): "materials-tugger-cart-transfer-br-ro-ro",
    ("material", "transfert by push cart"): "materials-push-cart-transfer",
    ("material", "transfert by sequenced cart"): "materials-sequenced-cart-transfer",
    ("material", "transfert bysequenced cart"): "materials-sequenced-cart-transfer",
    ("material", "transfert by agc"): "materials-agc-transfer",
    ("material", "small boxes delivered by forklift full"): "materials-forklift-sb-full",
    ("material", "small boxes delivered by forklift empty"): "materials-forklift-sb-empty",
}


def num(value):
    return float(value or 0)


def slug(value):
    text = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return text or "symbol"


def title_of(text):
    text = " ".join(text.replace("\n", " ").split())
    text = text.replace("--", "-").replace("*", "").strip(" .")
    head = re.split(r"\s+:\s+|\s+:|:\s+", text, maxsplit=1)[0].strip()
    return head if len(text) > 70 else text


def strings():
    values = []
    root = ET.parse(ROOT / "xl/sharedStrings.xml").getroot()
    for item in root.findall("m:si", NS):
        values.append(" ".join((node.text or "") for node in item.iter(f"{{{M}}}t")))
    return values


def cells(sheet, shared):
    found = {}
    root = ET.parse(ROOT / "xl/worksheets" / f"{sheet}.xml").getroot()
    for cell in root.iter(f"{{{M}}}c"):
        ref = cell.get("r")
        column = re.match(r"[A-Z]+", ref).group(0)
        row = int(re.search(r"\d+", ref).group(0)) - 1
        value = cell.find("m:v", NS)
        text = ""
        if cell.get("t") == "s" and value is not None and value.text:
            text = shared[int(value.text)]
        elif value is not None and value.text:
            text = value.text
        text = " ".join(text.split())
        if text and text not in {'"', "d"}:
            found[(column, row)] = text
    return found


def theme_colors():
    root = ET.parse(ROOT / "xl/theme/theme1.xml").getroot()
    scheme = root.find(".//a:clrScheme", NS)
    colors = {}
    for node in list(scheme):
        name = node.tag.split("}")[-1]
        srgb = node.find("a:srgbClr", NS)
        system = node.find("a:sysClr", NS)
        colors[name] = (srgb.get("val") if srgb is not None else system.get("lastClr")).lower()
    colors["bg1"], colors["tx1"], colors["bg2"], colors["tx2"] = colors["lt1"], colors["dk1"], colors["lt2"], colors["dk2"]
    return colors


THEME = theme_colors()


def hex_of(node):
    if node is None:
        return None
    color = node.find("a:srgbClr", NS)
    if color is not None:
        return "#" + color.get("val").lower()
    scheme = node.find("a:schemeClr", NS)
    if scheme is not None:
        return "#" + THEME.get(scheme.get("val"), "000000").lower()
    return None


def paint(node):
    if node is None:
        return None
    for child in list(node):
        tag = child.tag.split("}")[-1]
        if tag == "noFill":
            return None
        if tag == "solidFill":
            return hex_of(child)
    return None


def multiply(left, right):
    a1, b1, c1, d1, e1, f1 = left
    a2, b2, c2, d2, e2, f2 = right
    return (
        a1 * a2 + c1 * b2,
        b1 * a2 + d1 * b2,
        a1 * c2 + c1 * d2,
        b1 * c2 + d1 * d2,
        a1 * e2 + c1 * f2 + e1,
        b1 * e2 + d1 * f2 + f1,
    )


def apply(matrix, x, y):
    a, b, c, d, e, f = matrix
    return a * x + c * y + e, b * x + d * y + f


def group_matrix(node):
    xfrm = node.find("xdr:grpSpPr/a:xfrm", NS)
    if xfrm is None:
        return (1, 0, 0, 1, 0, 0)
    off = xfrm.find("a:off", NS)
    ext = xfrm.find("a:ext", NS)
    ch_off = xfrm.find("a:chOff", NS)
    ch_ext = xfrm.find("a:chExt", NS)
    ox, oy = num(off.get("x") if off is not None else 0), num(off.get("y") if off is not None else 0)
    cx, cy = num(ext.get("cx") if ext is not None else 0), num(ext.get("cy") if ext is not None else 0)
    chx = num(ch_off.get("x") if ch_off is not None else ox)
    chy = num(ch_off.get("y") if ch_off is not None else oy)
    chcx = num(ch_ext.get("cx") if ch_ext is not None else cx)
    chcy = num(ch_ext.get("cy") if ch_ext is not None else cy)
    sx = cx / chcx if chcx else 1
    sy = cy / chcy if chcy else 1
    flip_h = xfrm.get("flipH") == "1"
    flip_v = xfrm.get("flipV") == "1"
    ax = -sx if flip_h else sx
    ay = -sy if flip_v else sy
    tx = ox + (cx + chx * sx if flip_h else -chx * sx)
    ty = oy + (cy + chy * sy if flip_v else -chy * sy)
    return (ax, 0, 0, ay, tx, ty)


def shape_matrix(xfrm, width, height):
    off = xfrm.find("a:off", NS) if xfrm is not None else None
    ox, oy = num(off.get("x") if off is not None else 0), num(off.get("y") if off is not None else 0)
    matrix = (1, 0, 0, 1, ox, oy)
    if xfrm is None:
        return matrix
    flips = (1, 0, 0, 1, 0, 0)
    if xfrm.get("flipH") == "1":
        flips = multiply((-1, 0, 0, 1, width, 0), flips)
    if xfrm.get("flipV") == "1":
        flips = multiply((1, 0, 0, -1, 0, height), flips)
    rotation = num(xfrm.get("rot")) / 60000
    if rotation:
        radians = math.radians(rotation)
        cosine, sine = math.cos(radians), math.sin(radians)
        cx, cy = width / 2, height / 2
        spin = (cosine, sine, -sine, cosine, cx - cosine * cx + sine * cy, cy - sine * cx - cosine * cy)
        flips = multiply(spin, flips)
    return multiply(matrix, flips)


def preset(kind, width, height):
    if width <= 0 and height <= 0:
        return []
    if kind in {"rect", "roundRect", "flowChartDelay", "textPlain", "can"}:
        return [("M", 0, 0), ("L", width, 0), ("L", width, height), ("L", 0, height), ("Z",)]
    if kind == "ellipse":
        k = 0.5522847498
        rx, ry = width / 2, height / 2
        return [
            ("M", width, ry),
            ("C", width, ry + k * ry, rx + k * rx, height, rx, height),
            ("C", rx - k * rx, height, 0, ry + k * ry, 0, ry),
            ("C", 0, ry - k * ry, rx - k * rx, 0, rx, 0),
            ("C", rx + k * rx, 0, width, ry - k * ry, width, ry),
            ("Z",),
        ]
    if kind == "triangle":
        return [("M", width / 2, 0), ("L", width, height), ("L", 0, height), ("Z",)]
    if kind == "rtTriangle":
        return [("M", 0, 0), ("L", width, height), ("L", 0, height), ("Z",)]
    if kind == "trapezoid":
        return [("M", width * 0.2, 0), ("L", width * 0.8, 0), ("L", width, height), ("L", 0, height), ("Z",)]
    if kind == "homePlate":
        return [("M", 0, 0), ("L", width * 0.75, 0), ("L", width, height / 2), ("L", width * 0.75, height), ("L", 0, height), ("Z",)]
    if kind == "hexagon":
        return [("M", width * 0.25, 0), ("L", width * 0.75, 0), ("L", width, height / 2), ("L", width * 0.75, height), ("L", width * 0.25, height), ("L", 0, height / 2), ("Z",)]
    if kind == "pentagon":
        return [("M", width / 2, 0), ("L", width, height * 0.38), ("L", width * 0.8, height), ("L", width * 0.2, height), ("L", 0, height * 0.38), ("Z",)]
    if kind == "rightArrow":
        return [("M", 0, height * 0.25), ("L", width * 0.6, height * 0.25), ("L", width * 0.6, 0), ("L", width, height / 2), ("L", width * 0.6, height), ("L", width * 0.6, height * 0.75), ("L", 0, height * 0.75), ("Z",)]
    if kind in {"straightConnector1", "line"}:
        # A connector fills its box from corner to corner. Flips on the shape pick the other diagonal,
        # and a flat box stays a horizontal or vertical line.
        return [("M", 0, 0), ("L", width, height)]
    if kind == "bentConnector3":
        return [("M", 0, 0), ("L", width / 2, 0), ("L", width / 2, height), ("L", width, height)]
    if kind == "arc":
        return [("M", 0, height), ("C", 0, height * 0.2, width, height * 0.2, width, height)]
    return [("M", 0, 0), ("L", width, 0), ("L", width, height), ("L", 0, height), ("Z",)]


def custom(sp_pr, width, height):
    geom = sp_pr.find("a:custGeom", NS)
    if geom is None:
        return None
    path = geom.find(".//a:path", NS)
    if path is None:
        return []
    pw, ph = num(path.get("w")) or width or 1, num(path.get("h")) or height or 1
    sx, sy = (width / pw if pw else 1), (height / ph if ph else 1)
    commands = []
    for node in path:
        tag = node.tag.split("}")[-1]
        points = [(num(point.get("x")) * sx, num(point.get("y")) * sy) for point in node.findall("a:pt", NS)]
        if tag == "moveTo" and points:
            commands.append(("M", points[0][0], points[0][1]))
        elif tag == "lnTo" and points:
            commands.append(("L", points[0][0], points[0][1]))
        elif tag == "cubicBezTo" and len(points) == 3:
            commands.append(("C", points[0][0], points[0][1], points[1][0], points[1][1], points[2][0], points[2][1]))
        elif tag == "close":
            commands.append(("Z",))
    return commands


def arrow(kind, x, y, angle, size):
    if kind in {None, "none"}:
        return []
    length = size * (1.6 if kind == "triangle" else 1.2)
    width = size * 0.9
    points = [(0, 0), (-length, width), (-length, -width)]
    cosine, sine = math.cos(angle), math.sin(angle)
    mapped = [(x + px * cosine - py * sine, y + px * sine + py * cosine) for px, py in points]
    return [("M", mapped[0][0], mapped[0][1]), ("L", mapped[1][0], mapped[1][1]), ("L", mapped[2][0], mapped[2][1]), ("Z",)]


def transform_commands(commands, matrix):
    moved = []
    for command in commands:
        if command[0] == "Z":
            moved.append(command)
        elif command[0] in {"M", "L"}:
            x, y = apply(matrix, command[1], command[2])
            moved.append((command[0], x, y))
        else:
            points = []
            for index in range(1, len(command), 2):
                x, y = apply(matrix, command[index], command[index + 1])
                points.extend((x, y))
            moved.append((command[0], *points))
    return moved


def walk(node, ancestors, media, drawings, frame=None):
    for child in list(node):
        tag = child.tag.split("}")[-1]
        if tag == "grpSp":
            walk(child, ancestors + [group_matrix(child)], media, drawings, frame)
            continue
        if tag not in {"sp", "cxnSp", "pic"}:
            continue
        sp_pr = child.find("xdr:spPr", NS)
        xfrm = sp_pr.find("a:xfrm", NS) if sp_pr is not None else None
        ext = xfrm.find("a:ext", NS) if xfrm is not None else None
        width = num(ext.get("cx") if ext is not None else 0)
        height = num(ext.get("cy") if ext is not None else 0)
        local = shape_matrix(xfrm, width, height)
        matrix = local
        for parent in reversed(ancestors):
            matrix = multiply(parent, matrix)
        if tag == "pic":
            rel = child.find(".//a:blip", NS)
            embed = rel.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed") if rel is not None else None
            if (not width or not height) and frame:
                width, height = frame
                matrix = (1, 0, 0, 1, 0, 0)
                for parent in reversed(ancestors):
                    matrix = multiply(parent, matrix)
            if embed and embed in media and width and height:
                x0, y0 = apply(matrix, 0, 0)
                x1, y1 = apply(matrix, width, height)
                caption = child.find("xdr:nvPicPr/xdr:cNvPr", NS)
                drawings.append({
                    "image": media[embed],
                    "box": (min(x0, x1), min(y0, y1), abs(x1 - x0), abs(y1 - y0)),
                    "descr": (caption.get("descr") if caption is not None else "") or "",
                })
            continue
        if sp_pr is None:
            continue
        preset_node = sp_pr.find("a:prstGeom", NS)
        kind = preset_node.get("prst") if preset_node is not None else "rect"
        commands = custom(sp_pr, width, height)
        if commands is None:
            commands = preset(kind, width, height)
        if not commands:
            continue
        style = child.find("xdr:style", NS)
        line = sp_pr.find("a:ln", NS)
        fill = paint(sp_pr)
        stroke = paint(line) if line is not None else None
        if fill is None and style is not None:
            fill = paint(style.find("a:fillRef", NS))
        if stroke is None and style is not None:
            stroke = paint(style.find("a:lnRef", NS))
        if line is not None and line.find("a:noFill", NS) is not None:
            stroke = None
        paragraphs = []
        for paragraph in child.findall(".//a:p", NS):
            bits = [node.text for node in paragraph.findall(".//a:t", NS) if node.text]
            if bits:
                paragraphs.append("".join(bits))
        text = "\n".join(paragraphs).strip()
        if fill is None and stroke is None:
            # A text box has no border of its own. Keep its frame only when the
            # symbol is nothing but that caption, so it does not sit on top of a drawing.
            if text:
                commands = transform_commands(preset("rect", width, height), matrix)
                drawings.append({"commands": commands, "fill": None, "stroke": "#000000", "width": 9525, "textFrame": True})
            continue
        weight = max(num(line.get("w") if line is not None else 0), 9525) if stroke else 0
        commands = transform_commands(commands, matrix)
        drawings.append({"commands": commands, "fill": fill, "stroke": stroke, "width": weight})
        if text:
            center_x, center_y = apply(matrix, width / 2, height / 2)
            _, top = apply(matrix, 0, 0)
            _, bottom = apply(matrix, 0, height or 1)
            drawings.append({"label": text, "x": center_x, "y": center_y, "size": max(abs(bottom - top) * 0.34, 8000)})
        if stroke and kind in {"straightConnector1", "line", "bentConnector3"} and line is not None:
            head = line.find("a:headEnd", NS)
            tail = line.find("a:tailEnd", NS)
            start = apply(matrix, 0, 0 if kind == "straightConnector1" else height / 2)
            end = apply(matrix, width, height if kind == "straightConnector1" else height / 2)
            if head is not None and head.get("type") not in {None, "none"}:
                angle = math.atan2(start[1] - end[1], start[0] - end[0])
                drawings.append({"commands": arrow(head.get("type"), *start, angle, weight), "fill": stroke, "stroke": None, "width": 0, "arrow": weight})
            if tail is not None and tail.get("type") not in {None, "none"}:
                angle = math.atan2(end[1] - start[1], end[0] - start[0])
                drawings.append({"commands": arrow(tail.get("type"), *end, angle, weight), "fill": stroke, "stroke": None, "width": 0, "arrow": weight})


def path_of(commands, origin_x, origin_y):
    parts = []
    for command in commands:
        if command[0] == "Z":
            parts.append("Z")
            continue
        numbers = []
        for index, value in enumerate(command[1:]):
            shifted = value - (origin_x if index % 2 == 0 else origin_y)
            numbers.append(str(round(shifted, 1)))
        parts.append(command[0] + " " + " ".join(numbers))
    return "".join(parts)


def points_of(commands):
    points = []
    for command in commands:
        for index in range(1, len(command), 2):
            points.append((command[index], command[index + 1]))
    return points


def chain_strokes(drawings):
    """Join spreadsheet connector lines that were meant to be one outline.

    Each roof edge of the supplier, for example, is its own connector and the
    ends miss by a fraction of a millimetre, so the icon looks broken. Lines
    whose ends meet are drawn as one path.
    """
    pool = []
    other = []
    for drawing in drawings:
        commands = drawing.get("commands")
        if not commands or drawing.get("fill") or drawing.get("textFrame") or not drawing.get("stroke"):
            other.append(drawing)
            continue
        if any(command[0] not in {"M", "L"} for command in commands):
            other.append(drawing)
            continue
        pts = points_of(commands)
        if len(pts) < 2:
            other.append(drawing)
            continue
        pool.append((pts, drawing))
    if len(pool) < 2:
        return drawings
    span = max(max(point[0], point[1]) for pts, _ in pool for point in pts) or 1
    tolerance = max(2500, span * 0.004)
    used = [False] * len(pool)
    result = list(other)
    for index, (pts, drawing) in enumerate(pool):
        if used[index]:
            continue
        used[index] = True
        chain = list(pts)
        changed = True
        while changed:
            changed = False
            best = None
            for other_index, (other_pts, _) in enumerate(pool):
                if used[other_index]:
                    continue
                for reverse_chain, reverse_segment, end, start in (
                    (False, False, chain[-1], other_pts[0]),
                    (False, True, chain[-1], other_pts[-1]),
                    (True, False, chain[0], other_pts[0]),
                    (True, True, chain[0], other_pts[-1]),
                ):
                    distance = math.hypot(end[0] - start[0], end[1] - start[1])
                    if distance <= tolerance and (best is None or distance < best[0]):
                        best = (distance, other_index, reverse_chain, reverse_segment)
            if best:
                _, other_index, reverse_chain, reverse_segment = best
                segment = list(pool[other_index][0])
                if reverse_segment:
                    segment.reverse()
                if reverse_chain:
                    chain.reverse()
                chain.extend(segment[1:])
                used[other_index] = True
                changed = True
        commands = [("M", chain[0][0], chain[0][1])]
        commands.extend(("L", point[0], point[1]) for point in chain[1:])
        if math.hypot(chain[0][0] - chain[-1][0], chain[0][1] - chain[-1][1]) <= tolerance:
            commands.append(("Z",))
        result.append({**drawing, "commands": commands})
    return result


def scale_about(commands, origin, factor):
    ox, oy = origin
    scaled = []
    for command in commands:
        if command[0] == "Z":
            scaled.append(command)
            continue
        numbers = []
        for index in range(1, len(command), 2):
            numbers.append(ox + (command[index] - ox) * factor)
            numbers.append(oy + (command[index + 1] - oy) * factor)
        scaled.append((command[0], *numbers))
    return scaled


def symbol_from(drawings):
    drawings = chain_strokes(drawings)
    points = []
    images = []
    labels = []
    has_art = any(("commands" in drawing and not drawing.get("textFrame")) or "box" in drawing for drawing in drawings)
    for drawing in drawings:
        if "commands" in drawing:
            if drawing.get("textFrame") and has_art:
                continue
            points.extend(points_of(drawing["commands"]))
        elif "box" in drawing:
            x, y, width, height = drawing["box"]
            points.extend([(x, y), (x + width, y + height)])
            images.append(drawing)
        elif "label" in drawing:
            labels.append(drawing)
    if not points:
        return None
    # One pen for every outline. Spreadsheet lines keep their own point size, so a
    # factory and a cart look like different weights once the icons are the same size.
    ink = []
    for drawing in drawings:
        if drawing.get("arrow"):
            continue
        if "commands" in drawing and not (drawing.get("textFrame") and has_art):
            ink.extend(points_of(drawing["commands"]))
        elif "box" in drawing:
            x, y, box_width, box_height = drawing["box"]
            ink.extend([(x, y), (x + box_width, y + box_height)])
    sample = ink or points
    span = max(max(point[0] for point in sample) - min(point[0] for point in sample), max(point[1] for point in sample) - min(point[1] for point in sample))
    pen = max(span * 0.018, 1200)
    for drawing in drawings:
        if drawing.get("arrow"):
            factor = pen / drawing["arrow"] if drawing["arrow"] else 1
            tip = drawing["commands"][0]
            drawing["commands"] = scale_about(drawing["commands"], (tip[1], tip[2]), factor)
        if drawing.get("stroke"):
            drawing["width"] = pen
    points = []
    for drawing in drawings:
        if "commands" in drawing:
            if drawing.get("textFrame") and has_art:
                continue
            points.extend(points_of(drawing["commands"]))
        elif "box" in drawing:
            x, y, box_width, box_height = drawing["box"]
            points.extend([(x, y), (x + box_width, y + box_height)])
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    pad = pen / 2 + 400
    min_x, min_y = min(xs) - pad, min(ys) - pad
    width, height = max(xs) - min_x + pad, max(ys) - min_y + pad
    if width < 1000 or height < 1000:
        return None
    paths = []
    for drawing in drawings:
        if "commands" not in drawing or (drawing.get("textFrame") and has_art):
            continue
        path = {
            "d": path_of(drawing["commands"], min_x, min_y),
            "fill": drawing["fill"],
            "stroke": drawing["stroke"],
            "width": round(drawing["width"], 1),
        }
        if drawing.get("arrow"):
            path["arrow"] = round(pen, 1)
        paths.append(path)
    placed = []
    for drawing in images:
        x, y, box_width, box_height = drawing["box"]
        placed.append({"file": drawing["image"], "x": round(x - min_x, 1), "y": round(y - min_y, 1), "width": round(box_width, 1), "height": round(box_height, 1)})
    placed_labels = []
    for drawing in labels:
        placed_labels.append({"text": drawing["label"], "x": round(drawing["x"] - min_x, 1), "y": round(drawing["y"] - min_y, 1), "size": round(drawing["size"], 1)})
    return {"width": round(width, 1), "height": round(height, 1), "paths": paths, "images": placed, "labels": placed_labels}


def anchors(drawing):
    root = ET.parse(ROOT / "xl/drawings" / f"{drawing}.xml").getroot()
    rels = {}
    rel_path = ROOT / "xl/drawings/_rels" / f"{drawing}.xml.rels"
    if rel_path.exists():
        for rel in ET.parse(rel_path).getroot():
            rels[rel.get("Id")] = str((ROOT / "xl/drawings" / rel.get("Target")).resolve())
    found = []
    for node in list(root):
        tag = node.tag.split("}")[-1]
        if tag not in {"oneCellAnchor", "twoCellAnchor"}:
            continue
        start = node.find("xdr:from", NS)
        ext = node.find("xdr:ext", NS)
        column = int(start.find("xdr:col", NS).text)
        row = int(start.find("xdr:row", NS).text)
        cx = num(ext.get("cx")) if ext is not None else 0
        cy = num(ext.get("cy")) if ext is not None else 0
        drawings = []
        walk(node, [], rels, drawings, (cx, cy))
        found.append({"col": column, "row": row, "cx": cx, "cy": cy, "drawings": drawings})
    return found


def name_for(sheet_cells, column, row):
    letter = chr(ord("A") + column + 1)
    text = sheet_cells.get((letter, row), "")
    if text and len(text) > 1:
        return text
    return ""


def stable_id(folder, name, used):
    key = (folder.lower(), re.sub(r"[^a-z0-9]+", " ", name.lower()).strip())
    chosen = STABLE.get(key)
    if not chosen:
        chosen = slug(f"{folder}-{name}")
    base = chosen
    index = 2
    while chosen in used:
        chosen = f"{base}-{index}"
        index += 1
    used.add(chosen)
    return chosen


def catalogue():
    shared = strings()
    used = set()
    symbols = []
    for sheet, drawing, folder in SHEETS:
        sheet_cells = cells(sheet, shared)
        groups = {}
        for anchor in anchors(drawing):
            if anchor["cy"] < 20000 and anchor["cx"] < 20000:
                continue
            groups.setdefault((anchor["col"], anchor["row"]), []).append(anchor)
        claimed = set()
        for (column, row), group in sorted(groups.items()):
            raw = name_for(sheet_cells, column, row)
            if not raw:
                continue
            claimed.add((column, row))
            group.sort(key=lambda item: item["col"])
            def arrow_only(item):
                return item["cy"] < 70000 and item["cx"] > item["cy"] * 6
            kept = [item for item in group if not arrow_only(item)] or group
            substantial = [item for item in kept if item["cy"] > 90000 and item["cx"] > 90000]
            pieces = substantial if len(substantial) >= 2 else [{"drawings": sum((item["drawings"] for item in kept), [])}]
            names = []
            if len(pieces) == 2 and "full" in raw.lower() and "empty" in raw.lower():
                base = re.sub(r"full\s*[-/]\s*empty", "", raw, flags=re.I).strip(" -")
                names = [f"{title_of(base)} full", f"{title_of(base)} empty"]
            elif len(pieces) == 2 and "production line" in raw.lower():
                names = ["Production line in batches", "Production line in sequences"]
            else:
                pieces = [{"drawings": sum((item["drawings"] for item in kept), [])}]
                names = [title_of(raw)]
            for piece, name in zip(pieces, names):
                built = symbol_from(piece["drawings"])
                if not built:
                    continue
                symbols.append({"id": stable_id(folder, name, used), "name": name, "folder": folder, **built})
        for (column, row), group in sorted(groups.items()):
            if (column, row) in claimed:
                continue
            descriptions = []
            texts = []
            for anchor in group:
                for drawing in anchor["drawings"]:
                    if drawing.get("descr"):
                        descriptions.append(drawing["descr"])
                    if drawing.get("label"):
                        texts.append(drawing["label"])
            above = name_for(sheet_cells, column, row - 1) if row else ""
            above_taken = (column, row - 1) in claimed
            large = any(anchor["cx"] > 1500000 and anchor["cy"] > 1000000 for anchor in group)
            if any("cross" in text.lower() for text in texts):
                raw = "SB Cross-Dock"
            elif descriptions:
                raw = descriptions[0].replace("vsm ", "").strip()
            elif above and not above_taken:
                raw = above
            elif large:
                raw = "Crossdok"
            else:
                continue
            for index, anchor in enumerate(group):
                built = symbol_from(anchor["drawings"])
                if not built:
                    continue
                name = title_of(raw) if index == 0 else f"{title_of(raw)} {index + 1}"
                symbols.append({"id": stable_id(folder, name, used), "name": name, "folder": folder, **built})
    return symbols


def js(value):
    if value is None:
        return "null"
    return "'" + str(value).replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n") + "'"


def emit(symbols):
    if PUBLIC.exists():
        shutil.rmtree(PUBLIC)
    PUBLIC.mkdir(parents=True)
    lines = [
        "/** Vector artwork taken from the MIFA symbol spreadsheet. Folders are the workbook sheets. */",
        "export type ArtPath = { d: string; fill: string | null; stroke: string | null; width: number; arrow?: number };",
        "export type ArtImage = { href: string; x: number; y: number; width: number; height: number };",
        "export type ArtLabel = { text: string; x: number; y: number; size: number };",
        "export type SymbolArt = { id: string; name: string; folder: string; width: number; height: number; paths: ArtPath[]; images?: ArtImage[]; labels?: ArtLabel[] };",
        "",
        "export const SYMBOL_ART: SymbolArt[] = [",
    ]
    for symbol in symbols:
        images = []
        for index, image in enumerate(symbol["images"]):
            target = PUBLIC / f"{symbol['id']}-{index}.png"
            shutil.copy(image["file"], target)
            images.append({**image, "href": f"symbols/{target.name}"})
        lines.append("  {")
        lines.append(f"    id: {js(symbol['id'])},")
        lines.append(f"    name: {js(symbol['name'])},")
        lines.append(f"    folder: {js(symbol['folder'])},")
        lines.append(f"    width: {symbol['width']},")
        lines.append(f"    height: {symbol['height']},")
        lines.append("    paths: [")
        for path in symbol["paths"]:
            arrow = f", arrow: {path['arrow']}" if path.get("arrow") else ""
            lines.append(f"      {{ d: {js(path['d'])}, fill: {js(path['fill'])}, stroke: {js(path['stroke'])}, width: {path['width']}{arrow} }},")
        lines.append("    ],")
        if images:
            lines.append("    images: [")
            for image in images:
                lines.append(f"      {{ href: {js(image['href'])}, x: {image['x']}, y: {image['y']}, width: {image['width']}, height: {image['height']} }},")
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


def main():
    symbols = catalogue()
    print(f"{len(symbols)} symbols")
    for symbol in symbols:
        print(f"  {symbol['folder']:16} {symbol['name'][:48]:48} paths={len(symbol['paths']):3} images={len(symbol['images'])}")
    emit(symbols)


if __name__ == "__main__":
    main()
