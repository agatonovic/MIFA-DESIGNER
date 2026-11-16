"""Pull the green-marked drawings out of the symbol-sheet PDFs.

The spreadsheet print is vector artwork. A light-green cell is the symbol's
name. The drawing sits in the cell to its left. This script lists those pairs
and can write them as SymbolArt entries.
"""

import math
import re
import sys
import zlib
from pathlib import Path

GREEN = (0.8862745, 0.9372549, 0.8509804)
SHIFT = 0x1D


def tokenize(text: str):
    i = 0
    n = len(text)
    while i < n:
        char = text[i]
        if char.isspace():
            i += 1
            continue
        if char == "%":
            while i < n and text[i] not in "\r\n":
                i += 1
            continue
        if char == "(":
            i += 1
            raw = bytearray()
            while i < n:
                if text[i] == "\\":
                    nxt = text[i + 1] if i + 1 < n else ""
                    if nxt in "nrtbf":
                        raw.append({"n": 10, "r": 13, "t": 9, "b": 8, "f": 12}[nxt])
                        i += 2
                    elif nxt in "()\\":
                        raw.append(ord(nxt))
                        i += 2
                    elif nxt.isdigit():
                        octal = nxt
                        i += 2
                        for _ in range(2):
                            if i < n and text[i].isdigit():
                                octal += text[i]
                                i += 1
                            else:
                                break
                        raw.append(int(octal, 8) & 255)
                    else:
                        raw.append(ord(nxt) if nxt else 0)
                        i += 2
                elif text[i] == ")":
                    i += 1
                    break
                else:
                    raw.append(ord(text[i]))
                    i += 1
            yield ("str", decode(bytes(raw)))
            continue
        if char == "<":
            end = text.find(">", i)
            yield text[i : end + 1]
            i = end + 1
            continue
        if char == "[":
            end = text.find("]", i)
            yield text[i : end + 1]
            i = end + 1
            continue
        if char in "+-.0123456789":
            end = i + 1
            dot = char == "."
            while end < n and text[end] in "+-.0123456789":
                if text[end] in "+-":
                    break
                if text[end] == ".":
                    if dot:
                        break
                    dot = True
                end += 1
            yield text[i:end]
            i = end
            continue
        if char == "/":
            end = i + 1
            while end < n and text[end] not in " \t\r\n[]()/<>":
                end += 1
            yield text[i:end]
            i = end
            continue
        end = i + 1
        while end < n and not text[end].isspace() and text[end] not in "/[]()<>0123456789":
            end += 1
        yield text[i:end]
        i = end


def decode(raw: bytes) -> str:
    if len(raw) >= 2 and raw[0] == 0:
        chars = []
        for index in range(0, len(raw) - 1, 2):
            chars.append(chr((raw[index + 1] + SHIFT) & 0xFF))
        return "".join(chars).replace("\r", "\n")
    return raw.decode("latin1", errors="replace")


def multiply(current, incoming):
    a, b, c, d, e, f = current
    a2, b2, c2, d2, e2, f2 = incoming
    return [
        a2 * a + b2 * c,
        a2 * b + b2 * d,
        c2 * a + d2 * c,
        c2 * b + d2 * d,
        e2 * a + f2 * c + e,
        e2 * b + f2 * d + f,
    ]


def apply(matrix, x, y):
    a, b, c, d, e, f = matrix
    return (a * x + c * y + e, b * x + d * y + f)


def scale_of(matrix):
    a, b, c, d, *_ = matrix
    return max(1e-6, (math.hypot(a, b) + math.hypot(c, d)) / 2)


def near(color, target, tol=0.03):
    return all(abs(channel - aim) <= tol for channel, aim in zip(color, target))


def streams(data: bytes):
    for match in re.finditer(rb"stream\r?\n(.*?)\r?\nendstream", data, re.S):
        raw = match.group(1)
        try:
            yield zlib.decompress(raw)
        except zlib.error:
            yield raw


def bbox_of(commands):
    points = []
    for command in commands:
        numbers = command[1:]
        points.extend(zip(numbers[0::2], numbers[1::2]))
    if not points:
        return None
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return (min(xs), min(ys), max(xs), max(ys))


def parse(path: Path):
    pages = []
    for raw in streams(path.read_bytes()):
        text = raw.decode("latin1", errors="replace")
        if "\nm\n" not in text and not text.startswith("m\n"):
            continue
        cells = []
        paints = []
        texts = []
        matrix = [1, 0, 0, 1, 0, 0]
        saved = []
        fill = stroke = (0.0, 0.0, 0.0)
        width = 1.0
        alpha = 1.0
        commands = []
        stack: list[str] = []
        text_line = [1, 0, 0, 1, 0, 0]
        frames: list[dict] = []
        drawings = []
        rejected = []

        def point():
            y = float(stack.pop())
            x = float(stack.pop())
            return apply(matrix, x, y)

        def paint(kind):
            if alpha <= 0 or len(commands) < 2:
                return
            box = bbox_of(commands)
            if not box:
                return
            record = {
                "commands": commands[:],
                "fill": fill if kind == "fill" else None,
                "stroke": stroke if kind == "stroke" else None,
                "width": width * scale_of(matrix) if kind == "stroke" else 0,
                "box": box,
            }
            paints.append(record)
            if frames:
                frames[-1]["paints"].append(record)

        for token in tokenize(text):
            if token == "q":
                saved.append((matrix[:], alpha, stroke, fill, width, text_line[:]))
                frames.append({"paints": [], "clip": None})
                stack.clear()
            elif token == "Q":
                if saved:
                    matrix, alpha, stroke, fill, width, text_line = saved.pop()
                if frames:
                    frame = frames.pop()
                    box = frame["clip"]
                    if frame["paints"] and box:
                        wide = box[2] - box[0]
                        high = box[3] - box[1]
                        if 1.2 < wide < 240 and 1.2 < high < 260 and max(wide, high) > 12:
                            drawings.append({"box": box, "paints": frame["paints"]})
                        else:
                            loose = [paint for paint in frame["paints"] if not is_frame(paint)]
                            drawings.extend(cluster(loose))
                            rejected.append((round(wide), round(high), len(loose)))
                stack.clear()
            elif token == "cm":
                values = [float(stack.pop()) for _ in range(6)]
                values.reverse()
                matrix = multiply(matrix, values)
                stack.clear()
            elif token == "Tm":
                values = [float(stack.pop()) for _ in range(6)]
                values.reverse()
                text_line = values
                stack.clear()
            elif token == "Td":
                ty = float(stack.pop())
                tx = float(stack.pop())
                text_line = multiply(text_line, [1, 0, 0, 1, tx, ty])
                stack.clear()
            elif isinstance(token, tuple) and token[0] == "str":
                x, y = apply(matrix, text_line[4], text_line[5])
                texts.append({"x": x, "y": y, "text": token[1]})
                stack.clear()
            elif token == "Tj":
                stack.clear()
            elif token == "m":
                x, y = point()
                commands = [("M", x, y)]
                stack.clear()
            elif token == "l":
                x, y = point()
                commands.append(("L", x, y))
                stack.clear()
            elif token == "c":
                x3, y3 = point()
                x2, y2 = point()
                x1, y1 = point()
                commands.append(("C", x1, y1, x2, y2, x3, y3))
                stack.clear()
            elif token == "h":
                if commands and commands[0][0] == "M":
                    commands.append(("L", commands[0][1], commands[0][2]))
                stack.clear()
            elif token == "S":
                paint("stroke")
                commands = []
                stack.clear()
            elif token in ("f", "f*"):
                box = bbox_of(commands)
                if box and near(fill, GREEN):
                    width_box = box[2] - box[0]
                    height_box = box[3] - box[1]
                    if width_box > 40 and height_box > 20:
                        cells.append({"box": box, "lines": []})
                paint("fill")
                commands = []
                stack.clear()
            elif token in ("n", "W", "W*"):
                if token in ("W", "W*") and frames and commands:
                    frames[-1]["clip"] = bbox_of(commands)
                commands = []
                stack.clear()
            elif token == "rg":
                blue, green, red = (float(stack.pop()) for _ in range(3))
                fill = (red, green, blue)
                stack.clear()
            elif token == "RG":
                blue, green, red = (float(stack.pop()) for _ in range(3))
                stroke = (red, green, blue)
                stack.clear()
            elif token == "w":
                width = float(stack.pop())
                stack.clear()
            elif token == "gs":
                name = stack.pop() if stack else ""
                alpha = 0 if name == "/Alpha0" else 1
                stack.clear()
            elif token[0] in "0123456789+-." or token.startswith("/") or token.startswith("[") or token.startswith("<"):
                stack.append(token)
            else:
                stack.clear()
        for item in texts:
            for cell in cells:
                x0, y0, x1, y1 = cell["box"]
                if x0 - 2 <= item["x"] <= x1 + 2 and y0 - 4 <= item["y"] <= y1 + 4:
                    cell["lines"].append(item)
                    break
        for cell in cells:
            cell["lines"].sort(key=lambda item: (-item["y"], item["x"]))
            cell["name"] = clean(" ".join(item["text"] for item in cell["lines"]))
        merged: dict[tuple, dict] = {}
        for drawing in drawings:
            key = tuple(round(value, 0) for value in drawing["box"])
            current = merged.get(key)
            if current:
                current["paints"].extend(drawing["paints"])
            else:
                merged[key] = {"box": drawing["box"], "paints": drawing["paints"][:]}
        pages.append({"cells": cells, "paints": paints, "texts": texts, "drawings": list(merged.values()), "rejected": rejected})
    return pages


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip(" :")


def is_frame(paint):
    x0, y0, x1, y1 = paint["box"]
    width = x1 - x0
    height = y1 - y0
    if width > 280 or height > 520:
        return True
    if min(width, height) < 1.5 and max(width, height) > 260:
        return True
    if paint["fill"] and near(paint["fill"], (1, 1, 1)) and width > 150 and height > 80:
        return True
    if paint["fill"] and near(paint["fill"], GREEN) and width > 70 and height > 24:
        return True
    return False


def cluster(paints):
    kept = [paint for paint in paints if not is_frame(paint)]
    parent = list(range(len(kept)))

    def find(index):
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def overlap(a, b):
        ax0, ay0, ax1, ay1 = a
        bx0, by0, bx1, by1 = b
        return ax0 - 6 <= bx1 and bx0 - 6 <= ax1 and ay0 - 6 <= by1 and by0 - 6 <= ay1

    for i, left in enumerate(kept):
        for j in range(i + 1, len(kept)):
            if overlap(left["box"], kept[j]["box"]):
                parent[find(j)] = find(i)
    groups: dict[int, list] = {}
    for index, paint in enumerate(kept):
        groups.setdefault(find(index), []).append(paint)
    drawings = []
    for paints_in_group in groups.values():
        box = (
            min(paint["box"][0] for paint in paints_in_group),
            min(paint["box"][1] for paint in paints_in_group),
            max(paint["box"][2] for paint in paints_in_group),
            max(paint["box"][3] for paint in paints_in_group),
        )
        if box[2] - box[0] < 4 or box[3] - box[1] < 4:
            continue
        drawings.append({"box": box, "paints": paints_in_group})
    return drawings


def labels_of(cell):
    items = sorted(cell["lines"], key=lambda item: (-item["y"], item["x"]))
    if not items:
        return []
    lines = []
    for item in items:
        if lines and abs(lines[-1][0]["y"] - item["y"]) <= 8:
            lines[-1].append(item)
        else:
            lines.append([item])
    groups = [[lines[0]]]
    for line in lines[1:]:
        if groups[-1][-1][0]["y"] - line[0]["y"] > 22:
            groups.append([line])
        else:
            groups[-1].append(line)
    labels = []
    for group in groups:
        flat = [item for line in group for item in sorted(line, key=lambda item: item["x"])]
        ys = [item["y"] for item in flat]
        labels.append({"name": clean(" ".join(item["text"] for item in flat)), "top": max(ys), "bottom": min(ys), "box": cell["box"]})
    return labels


def match(cells, drawings):
    labels = []
    for cell in cells:
        for label in labels_of(cell):
            label["x"] = cell["box"][0]
            labels.append(label)
    assigned: dict[int, list] = {index: [] for index in range(len(labels))}
    for drawing in drawings:
        dx0, dy0, dx1, dy1 = drawing["box"]
        cy = (dy0 + dy1) / 2
        best = None
        best_distance = 1e9
        for index, label in enumerate(labels):
            if dx1 > label["x"] + 24 or dx0 > label["x"] or label["x"] - dx1 > 90:
                continue
            center = (label["top"] + label["bottom"]) / 2
            distance = abs(cy - center)
            if distance < best_distance:
                best = index
                best_distance = distance
        if best is not None and best_distance < 80:
            assigned[best].append(drawing)
    return [(labels[index]["name"], assigned[index]) for index in range(len(labels))]


def main():
    folder = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/mifa-sheet-export")
    for pdf in sorted(folder.glob("*.pdf")):
        pages = parse(pdf)
        print(f"\n== {pdf.name}  pages {len(pages)}")
        for number, page in enumerate(pages, start=1):
            drawings = page["drawings"] or cluster(page["paints"])
            print(f"  -- page {number}  cells {len(page['cells'])}  drawings {len(drawings)}  rejected {page['rejected'][:8]}")
            for name, drawings_for_cell in match(page["cells"], drawings):
                bits = []
                for drawing in drawings_for_cell:
                    dx0, dy0, dx1, dy1 = drawing["box"]
                    bits.append(f"{len(drawing['paints'])}p {dx1 - dx0:.0f}x{dy1 - dy0:.0f}")
                print(f"    {name[:72]:72}  {', '.join(bits) or 'NO DRAWING'}")


if __name__ == "__main__":
    main()
