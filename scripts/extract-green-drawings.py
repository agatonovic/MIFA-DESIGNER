"""Trace the green-marked symbols out of the workbook drawings.

A light-green cell is the symbol name. The drawing in the cell to its left is
the symbol. Custom geometry is copied as paths. A picture stored in the sheet
is traced from its silhouette, because that is the artwork the sheet holds.
"""

import math
import re
import struct
import zlib
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path("/tmp/mifa-xlsx")
OUT = Path(__file__).resolve().parents[1] / "src" / "green-symbols.ts"
NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "xdr": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pr": "http://schemas.openxmlformats.org/package/2006/relationships",
}
GREEN = "FFE2EFD9"
# These drawings are already traced from their own vector PDFs.
SKIP = {
    "supplier",
    "customer (production line)",
    "in sequences (right). in batches (left)",
    "transfert by truck",
    "man--handled transfert",
    "transfert by forklift",
    "transfert by tugger train (shelf carts)",
    "transfert by tugger cart (br, ro-ro)",
    "transfert by push cart",
    "transfert bysequenced cart",
    "transfert by agc",
    "big contailner or large volume full / empty",
    "small boxes (pallet) full / empty",
}
SHEETS = [
    ("sheet1.xml", "drawing1.xml", "Process"),
    ("sheet2.xml", "drawing2.xml", "Inventories"),
    ("sheet3.xml", "drawing3.xml", "Materials"),
]


def local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def number(value: float) -> str:
    text = f"{value:.2f}".rstrip("0").rstrip(".")
    return "0" if text in ("", "-0") else text


def slug(text: str) -> str:
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", text.lower())).strip("-")


def short_name(text: str) -> str:
    text = " ".join(text.replace("\n", " ").split())
    head, _, tail = text.partition(":")
    if tail and len(tail.strip()) > 40:
        return head.strip()
    return text.strip(" .")


def green_styles() -> set[int]:
    styles = ET.parse(ROOT / "xl/styles.xml")
    fills = []
    for fill in styles.findall(".//m:fills/m:fill", NS):
        color = fill.find(".//m:fgColor", NS)
        fills.append(color.get("rgb") if color is not None else None)
    chosen = set()
    for index, xf in enumerate(styles.findall(".//m:cellXfs/m:xf", NS)):
        fill_id = int(xf.get("fillId") or 0)
        if fill_id < len(fills) and fills[fill_id] == GREEN:
            chosen.add(index)
    return chosen


def shared_strings() -> list[str]:
    root = ET.parse(ROOT / "xl/sharedStrings.xml").getroot()
    return ["".join((node.text or "") for node in item.iter(f"{{{NS['m']}}}t")) for item in root.findall("m:si", NS)]


def column_index(ref: str) -> tuple[int, int]:
    letters = "".join(char for char in ref if char.isalpha())
    row = int("".join(char for char in ref if char.isdigit())) - 1
    column = 0
    for char in letters:
        column = column * 26 + ord(char) - 64
    return column - 1, row


def green_cells(sheet: str, styles: set[int], strings: list[str]) -> list[dict]:
    root = ET.parse(ROOT / "xl/worksheets" / sheet).getroot()
    cells = []
    for cell in root.iter(f"{{{NS['m']}}}c"):
        if int(cell.get("s") or 0) not in styles:
            continue
        value = cell.find("m:v", NS)
        if cell.get("t") == "s" and value is not None and value.text:
            text = strings[int(value.text)]
        elif value is not None and value.text:
            text = value.text
        else:
            text = ""
        name = short_name(text)
        if not name or name.lower() in SKIP:
            continue
        column, row = column_index(cell.get("r"))
        cells.append({"name": name, "column": column, "row": row})
    return cells


def color_of(element) -> str | None:
    if element is None:
        return None
    solid = element.find("a:solidFill", NS)
    if solid is None:
        if element.find("a:noFill", NS) is not None:
            return None
        return None
    rgb = solid.find("a:srgbClr", NS)
    if rgb is not None:
        return "#" + rgb.get("val").lower()
    scheme = solid.find("a:schemeClr", NS)
    if scheme is not None:
        return "#ffffff" if scheme.get("val") in ("lt1", "bg1") else "#000000"
    return "#000000"


def xfrm_of(element) -> dict | None:
    node = element.find(".//a:xfrm", NS)
    if node is None:
        return None
    off = node.find("a:off", NS)
    ext = node.find("a:ext", NS)
    return {
        "x": int(off.get("x")) if off is not None else 0,
        "y": int(off.get("y")) if off is not None else 0,
        "cx": int(ext.get("cx")) if ext is not None else 0,
        "cy": int(ext.get("cy")) if ext is not None else 0,
        "flipH": node.get("flipH") == "1",
        "flipV": node.get("flipV") == "1",
    }


def map_box(box: dict, parent: dict) -> dict:
    if parent["cx"] == 0 or parent["cy"] == 0:
        return box
    child_off = parent.get("chx", parent["x"])
    child_ext_x = parent.get("chcx", parent["cx"]) or 1
    child_off_y = parent.get("chy", parent["y"])
    child_ext_y = parent.get("chcy", parent["cy"]) or 1

    def point(x, y):
        px = (x - child_off) / child_ext_x * parent["cx"]
        py = (y - child_off_y) / child_ext_y * parent["cy"]
        if parent["flipH"]:
            px = parent["cx"] - px
        if parent["flipV"]:
            py = parent["cy"] - py
        return parent["x"] + px, parent["y"] + py

    corners = [point(box["x"], box["y"]), point(box["x"] + box["cx"], box["y"]), point(box["x"], box["y"] + box["cy"]), point(box["x"] + box["cx"], box["y"] + box["cy"])]
    xs = [corner[0] for corner in corners]
    ys = [corner[1] for corner in corners]
    return {"x": min(xs), "y": min(ys), "cx": max(xs) - min(xs), "cy": max(ys) - min(ys), "flipH": False, "flipV": False}


def group_xfrm(element) -> dict:
    node = element.find("a:xfrm", NS)
    off = node.find("a:off", NS)
    ext = node.find("a:ext", NS)
    child_off = node.find("a:chOff", NS)
    child_ext = node.find("a:chExt", NS)
    return {
        "x": int(off.get("x")),
        "y": int(off.get("y")),
        "cx": int(ext.get("cx")),
        "cy": int(ext.get("cy")),
        "chx": int(child_off.get("x")) if child_off is not None else 0,
        "chy": int(child_off.get("y")) if child_off is not None else 0,
        "chcx": int(child_ext.get("cx")) if child_ext is not None else int(ext.get("cx")),
        "chcy": int(child_ext.get("cy")) if child_ext is not None else int(ext.get("cy")),
        "flipH": node.get("flipH") == "1",
        "flipV": node.get("flipV") == "1",
    }


def line_of(element) -> tuple[str | None, float]:
    line = element.find("a:ln", NS)
    if line is None or line.find("a:noFill", NS) is not None:
        return None, 0
    width = int(line.get("w") or 9525)
    return color_of(line) or "#000000", width


def arrow_of(element) -> str | None:
    line = element.find("a:ln", NS)
    if line is None:
        return None
    tail = line.find("a:tailEnd", NS)
    if tail is not None and tail.get("type") not in (None, "none"):
        return "end"
    head = line.find("a:headEnd", NS)
    if head is not None and head.get("type") not in (None, "none"):
        return "start"
    return None


def ellipse_path(cx, cy) -> list[tuple]:
    kappa = 0.5522847498
    rx, ry = cx / 2, cy / 2
    mx, my = cx / 2, cy / 2
    kx, ky = rx * kappa, ry * kappa
    return [
        ("M", mx, my - ry),
        ("C", mx + kx, my - ry, mx + rx, my - ky, mx + rx, my),
        ("C", mx + rx, my + ky, mx + kx, my + ry, mx, my + ry),
        ("C", mx - kx, my + ry, mx - rx, my + ky, mx - rx, my),
        ("C", mx - rx, my - ky, mx - kx, my - ry, mx, my - ry),
        ("Z",),
    ]


def geometry(element, box: dict) -> list[tuple]:
    cx, cy = box["cx"], box["cy"]
    custom = element.find(".//a:custGeom", NS)
    if custom is not None:
        commands = []
        for path in custom.findall(".//a:path", NS):
            width = int(path.get("w") or cx or 1)
            height = int(path.get("h") or cy or 1)
            for child in path:
                name = local(child.tag)
                points = [(int(point.get("x")), int(point.get("y"))) for point in child.findall("a:pt", NS)]
                scaled = [(point[0] / width * cx, point[1] / height * cy) for point in points]
                if name == "moveTo" and scaled:
                    commands.append(("M", *scaled[0]))
                elif name == "lnTo" and scaled:
                    commands.append(("L", *scaled[0]))
                elif name == "cubicBezTo" and len(scaled) == 3:
                    commands.append(("C", *scaled[0], *scaled[1], *scaled[2]))
                elif name == "close":
                    commands.append(("Z",))
        return commands
    preset = element.find(".//a:prstGeom", NS)
    kind = preset.get("prst") if preset is not None else ""
    if kind in ("rect", "roundRect", "flowChartDelay", "textPlain"):
        return [("M", 0, 0), ("L", cx, 0), ("L", cx, cy), ("L", 0, cy), ("Z",)]
    if kind == "ellipse":
        return ellipse_path(max(cx, 1), max(cy, 1))
    if kind == "triangle":
        return [("M", cx / 2, 0), ("L", cx, cy), ("L", 0, cy), ("Z",)]
    if kind == "rtTriangle":
        return [("M", 0, 0), ("L", cx, cy), ("L", 0, cy), ("Z",)]
    if kind == "rightArrow":
        return [("M", 0, cy * 0.25), ("L", cx * 0.62, cy * 0.25), ("L", cx * 0.62, 0), ("L", cx, cy / 2), ("L", cx * 0.62, cy), ("L", cx * 0.62, cy * 0.75), ("L", 0, cy * 0.75), ("Z",)]
    if kind in ("straightConnector1", "line"):
        if cy <= cx:
            return [("M", 0, cy / 2), ("L", cx, cy / 2)]
        return [("M", cx / 2, 0), ("L", cx / 2, cy)]
    return []


def shift(commands: list[tuple], origin: dict) -> list[tuple]:
    moved = []
    for command in commands:
        kind = command[0]
        if kind == "Z":
            moved.append(command)
            continue
        numbers = []
        for index, value in enumerate(command[1:]):
            numbers.append(value + (origin["x"] if index % 2 == 0 else origin["y"]))
        moved.append((kind, *numbers))
    return moved


def arrow_head(commands: list[tuple], which: str, width: float) -> list[tuple]:
    points = []
    for command in commands:
        numbers = command[1:]
        points.extend(zip(numbers[0::2], numbers[1::2]))
    if len(points) < 2:
        return []
    end, start = (points[-1], points[-2]) if which == "end" else (points[0], points[1])
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    length = max(width * 6, 120000)
    spread = 0.45
    left = (end[0] - length * math.cos(angle - spread), end[1] - length * math.sin(angle - spread))
    right = (end[0] - length * math.cos(angle + spread), end[1] - length * math.sin(angle + spread))
    return [("M", *end), ("L", *left), ("L", *right), ("Z",)]


def shapes_of(element, inherited: dict | None = None) -> list[dict]:
    found = []
    for child in element:
        name = local(child.tag)
        if name == "grpSp":
            transform = group_xfrm(child.find("xdr:grpSpPr", NS))
            for shape in shapes_of(child, transform):
                if inherited:
                    shape["box"] = map_box(shape["box"], inherited)
                found.append(shape)
            continue
        if name not in ("sp", "cxnSp"):
            continue
        properties = child.find("xdr:spPr", NS)
        box = xfrm_of(properties)
        if box is None:
            continue
        if inherited:
            box = map_box(box, inherited)
        fill = color_of(properties)
        stroke, stroke_width = line_of(properties)
        commands = geometry(properties, box)
        if not commands:
            continue
        if fill is None and stroke is None:
            continue
        found.append({"box": box, "commands": shift(commands, box), "fill": fill, "stroke": stroke, "width": stroke_width, "arrow": arrow_of(properties)})
    return found


def anchors_of(drawing: str) -> list[dict]:
    root = ET.parse(ROOT / "xl/drawings" / drawing).getroot()
    rels = {}
    rel_path = ROOT / "xl/drawings/_rels" / f"{drawing}.rels"
    if rel_path.exists():
        for rel in ET.parse(rel_path).getroot():
            rels[rel.get("Id")] = rel.get("Target")
    found = []
    for anchor in list(root):
        if local(anchor.tag) not in ("oneCellAnchor", "twoCellAnchor"):
            continue
        start = anchor.find("xdr:from", NS)
        column = int(start.find("xdr:col", NS).text)
        row = int(start.find("xdr:row", NS).text)
        column_off = int(start.find("xdr:colOff", NS).text)
        row_off = int(start.find("xdr:rowOff", NS).text)
        picture = anchor.find("xdr:pic", NS)
        image = None
        if picture is not None:
            blip = picture.find(".//a:blip", NS)
            if blip is not None:
                image = rels.get(blip.get(f"{{{NS['r']}}}embed"))
        found.append({"column": column, "row": row, "x": column_off, "y": row_off, "shapes": shapes_of(anchor), "image": image})
    return found


def paeth(left: int, up: int, up_left: int) -> int:
    estimate = left + up - up_left
    choices = (abs(estimate - left), abs(estimate - up), abs(estimate - up_left))
    return (left, up, up_left)[choices.index(min(choices))]


def decode_png(path: Path) -> tuple[int, int, list[int]]:
    data = path.read_bytes()
    width = height = bit = color = None
    transparency = b""
    compressed = b""
    index = 8
    while index < len(data):
        size = int.from_bytes(data[index : index + 4], "big")
        kind = data[index + 4 : index + 8]
        chunk = data[index + 8 : index + 8 + size]
        if kind == b"IHDR":
            width, height, bit, color = struct.unpack(">IIBB", chunk[:10])
        elif kind == b"tRNS":
            transparency = chunk
        elif kind == b"IDAT":
            compressed += chunk
        index += 12 + size
    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[color]
    row_bytes = (width * channels * bit + 7) // 8
    raw = zlib.decompress(compressed)
    previous = bytearray(row_bytes)
    cursor = 0
    samples: list[int] = []
    for _ in range(height):
        filter_type = raw[cursor]
        scan = bytearray(raw[cursor + 1 : cursor + 1 + row_bytes])
        cursor += 1 + row_bytes
        current = bytearray(row_bytes)
        for byte_index, value in enumerate(scan):
            left = current[byte_index - 1] if byte_index else 0
            up = previous[byte_index]
            up_left = previous[byte_index - 1] if byte_index else 0
            if filter_type == 1:
                value = (value + left) & 255
            elif filter_type == 2:
                value = (value + up) & 255
            elif filter_type == 3:
                value = (value + ((left + up) // 2)) & 255
            elif filter_type == 4:
                value = (value + paeth(left, up, up_left)) & 255
            current[byte_index] = value
        previous = current
        if bit == 8:
            samples.extend(current)
        elif bit == 4:
            nibbles = []
            for byte in current:
                nibbles.extend((byte >> 4, byte & 15))
            samples.extend(nibbles[:width])
        else:
            raise ValueError(f"unsupported png {path.name}")
    alpha = []
    if color == 3:
        for pixel in samples:
            alpha.append(transparency[pixel] if pixel < len(transparency) else 255)
    elif color == 6:
        for pixel in range(width * height):
            alpha.append(samples[pixel * 4 + 3])
    else:
        alpha = [255] * (width * height)
    return width, height, alpha


def trace_image(path: Path) -> list[dict]:
    width, height, alpha = decode_png(path)
    # Walk the boundary of opaque pixels. These sheet pictures are one silhouette.
    solid = [value > 40 for value in alpha]

    def on(x, y):
        return 0 <= x < width and 0 <= y < height and solid[y * width + x]

    start = next((index for index, value in enumerate(solid) if value), None)
    if start is None:
        return []
    sx, sy = start % width, start // width
    # Moore neighborhood, clockwise, starting from the left of the first pixel.
    directions = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]
    x, y = sx, sy
    direction = 6
    contour = [(x, y)]
    for _ in range(width * height * 4):
        direction = (direction + 6) % 8
        moved = False
        for turn in range(8):
            nx, ny = x + directions[direction][0], y + directions[direction][1]
            if on(nx, ny):
                x, y = nx, ny
                contour.append((x, y))
                moved = True
                break
            direction = (direction + 1) % 8
        if not moved or (x == sx and y == sy and len(contour) > 4):
            break
    if len(contour) < 4:
        return []
    step = max(1, len(contour) // 180)
    picked = contour[::step]
    commands = [("M", picked[0][0], picked[0][1])]
    commands.extend(("L", point[0], point[1]) for point in picked[1:])
    commands.append(("Z",))
    return [{"commands": commands, "fill": "#000000", "stroke": None, "width": 0}]


def to_paths(paints: list[dict]) -> dict | None:
    points = []
    for paint in paints:
        for command in paint["commands"]:
            numbers = command[1:]
            points.extend(zip(numbers[0::2], numbers[1::2]))
    if not points:
        return None
    pad = max((paint["width"] for paint in paints), default=0) / 2 + 200
    min_x = min(point[0] for point in points) - pad
    min_y = min(point[1] for point in points) - pad
    max_x = max(point[0] for point in points) + pad
    max_y = max(point[1] for point in points) + pad
    paths = []
    for paint in paints:
        if paint.get("arrow"):
            paints_here = [paint, {"commands": arrow_head(paint["commands"], paint["arrow"], paint["width"]), "fill": paint["stroke"], "stroke": None, "width": 0}]
        else:
            paints_here = [paint]
        for item in paints_here:
            parts = []
            for command in item["commands"]:
                kind = command[0]
                if kind == "Z":
                    parts.append("Z")
                    continue
                shifted = [value - min_x if index % 2 == 0 else value - min_y for index, value in enumerate(command[1:])]
                if kind == "M":
                    parts.append(f"M{number(shifted[0])} {number(shifted[1])}")
                elif kind == "L":
                    parts.append(f"L{number(shifted[0])} {number(shifted[1])}")
                else:
                    parts.append("C" + " ".join(number(value) for value in shifted))
            if not parts:
                continue
            paths.append({"d": "".join(parts), "fill": item["fill"], "stroke": item["stroke"], "width": round(item["width"], 2)})
    if not paths:
        return None
    return {"width": round(max_x - min_x, 2), "height": round(max_y - min_y, 2), "paths": paths}


def folder_for(sheet_folder: str, name: str) -> str:
    lowered = name.lower()
    if sheet_folder == "Inventories" and "uncontrolled" in lowered:
        return "Inventories/Uncontroled Inventory"
    if sheet_folder == "Inventories" and "controlled" in lowered:
        return "Inventories/Contolled inventory"
    if sheet_folder == "Inventories" and "small box" in lowered:
        return "Inventories/Small Box (Pallet)"
    if sheet_folder == "Inventories" and "container" in lowered:
        return "Inventories/Big Container"
    return sheet_folder


def main():
    styles = green_styles()
    strings = shared_strings()
    arts = []
    seen = set()
    for sheet, drawing, folder in SHEETS:
        cells = green_cells(sheet, styles, strings)
        anchors = anchors_of(drawing)
        for cell in cells:
            chosen = [anchor for anchor in anchors if anchor["column"] == cell["column"] - 1 and anchor["row"] == cell["row"]]
            paints = []
            for anchor in chosen:
                if anchor["image"] and not anchor["shapes"]:
                    image = (ROOT / "xl/drawings" / anchor["image"]).resolve()
                    paints.extend(trace_image(image))
                    continue
                for shape in anchor["shapes"]:
                    moved = []
                    for command in shape["commands"]:
                        if command[0] == "Z":
                            moved.append(command)
                            continue
                        numbers = [value + (anchor["x"] if index % 2 == 0 else anchor["y"]) for index, value in enumerate(command[1:])]
                        moved.append((command[0], *numbers))
                    paints.append({**shape, "commands": moved})
            art = to_paths(paints)
            if not art:
                print(f"MISSING  {folder}  {cell['name']}")
                continue
            keep = {
                "Uncontrolled inventory": "Uncontrolled inventory",
                "Truck Preparation Area": "Truck Preparation Area",
                "Material Flow": "Material Flow",
                "Push flow": "Push flow",
                "Shipment, transport to the customer or from the supplier": "Shipment",
                "SILS transfert": "SILS transfert",
                "Big Container delivered by Forklift FULL-EMPTY": "Big Container delivered by Forklift",
                "AGC Convoy deliver*y": "AGC convoy",
            }
            if cell["name"] not in keep:
                print(f"HELD    {cell['name']}")
                continue
            cell["name"] = keep[cell["name"]]
            art_id = slug(f"{folder}-{cell['name']}")
            if art_id in seen:
                continue
            seen.add(art_id)
            arts.append({"id": art_id, "name": cell["name"], "folder": folder_for(folder, cell["name"]), **art})
            print(f"{len(art['paths']):4d}  {art['width']:8.0f} x {art['height']:8.0f}  {cell['name']}")

    lines = [
        "/** Green-marked symbols traced from the MIFA symbol workbook. */",
        "import type { SymbolArt } from \"./symbol-art\";",
        "",
        "export const GREEN_SYMBOLS: SymbolArt[] = [",
    ]
    for art in arts:
        lines.append("  {")
        lines.append(f"    id: {art['id']!r},")
        lines.append(f"    name: {art['name']!r},")
        lines.append(f"    folder: {art['folder']!r},")
        lines.append(f"    width: {art['width']},")
        lines.append(f"    height: {art['height']},")
        lines.append("    paths: [")
        for path in art["paths"]:
            fill = "null" if path["fill"] is None else repr(path["fill"])
            stroke = "null" if path["stroke"] is None else repr(path["stroke"])
            lines.append("      { d: " + repr(path["d"]) + f", fill: {fill}, stroke: {stroke}, width: {path['width']} }},")
        lines.append("    ],")
        lines.append("  },")
    lines += ["];", ""]
    OUT.write_text("\n".join(lines))
    print("wrote", OUT, "symbols", len(arts))


if __name__ == "__main__":
    main()
