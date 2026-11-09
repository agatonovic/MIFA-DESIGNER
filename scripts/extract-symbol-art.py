"""Trace visible paths out of the MIFA symbol PDFs into src/symbol-art.ts."""

import math
import re
import zlib
from pathlib import Path

ROOT = Path("/Users/nikola/Downloads/MIFA Symbols")
OUT = Path(__file__).resolve().parents[1] / "src" / "symbol-art.ts"


def tokenize(text: str) -> list[str]:
    tokens: list[str] = []
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
        if char == "[":
            end = text.find("]", i)
            tokens.append(text[i : end + 1])
            i = end + 1
            continue
        if char in "+-.0123456789":
            end = i + 1
            while end < n and text[end] in "+-.0123456789":
                end += 1
            tokens.append(text[i:end])
            i = end
            continue
        if char == "/":
            end = i + 1
            while end < n and text[end] not in " \t\r\n[]()/<>":
                end += 1
            tokens.append(text[i:end])
            i = end
            continue
        end = i + 1
        while end < n and not text[end].isspace() and text[end] not in "/[]()<>0123456789":
            end += 1
        tokens.append(text[i:end])
        i = end
    return tokens


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


def hex_color(rgb):
    return "#{:02x}{:02x}{:02x}".format(*(max(0, min(255, round(channel * 255))) for channel in rgb))


def number(value: float) -> str:
    text = f"{value:.2f}".rstrip("0").rstrip(".")
    return "0" if text in ("", "-0") else text


def streams(data: bytes):
    for match in re.finditer(rb"stream\r?\n(.*?)\r?\nendstream", data, re.S):
        raw = match.group(1)
        try:
            yield zlib.decompress(raw)
        except zlib.error:
            yield raw


def extract(path: Path):
    drawings = []
    for raw in streams(path.read_bytes()):
        text = raw.decode("latin1", errors="replace")
        if "\nm\n" not in text and not text.startswith("m\n"):
            continue
        matrix = [1, 0, 0, 1, 0, 0]
        saved = []
        alpha = 1.0
        stroke = fill = (0.0, 0.0, 0.0)
        width = 1.0
        commands = []
        stack: list[str] = []

        def point():
            y = float(stack.pop())
            x = float(stack.pop())
            return apply(matrix, x, y)

        def keep(kind: str):
            if alpha <= 0 or len(commands) < 2:
                return
            drawings.append(
                {
                    "commands": commands[:],
                    "fill": hex_color(fill) if kind == "fill" else None,
                    "stroke": hex_color(stroke) if kind == "stroke" else None,
                    "width": width * scale_of(matrix) if kind == "stroke" else 0,
                }
            )

        for token in tokenize(text):
            if token == "q":
                saved.append((matrix[:], alpha, stroke, fill, width))
                stack.clear()
            elif token == "Q":
                if saved:
                    matrix, alpha, stroke, fill, width = saved.pop()
                stack.clear()
            elif token == "cm":
                values = [float(stack.pop()) for _ in range(6)]
                values.reverse()
                matrix = multiply(matrix, values)
                stack.clear()
            elif token == "gs":
                name = stack.pop() if stack else ""
                if name == "/Alpha0":
                    alpha = 0
                elif name == "/Alpha1":
                    alpha = 1
                stack.clear()
            elif token == "RG":
                blue, green, red = (float(stack.pop()) for _ in range(3))
                stroke = (red, green, blue)
                stack.clear()
            elif token == "rg":
                blue, green, red = (float(stack.pop()) for _ in range(3))
                fill = (red, green, blue)
                stack.clear()
            elif token == "w":
                width = float(stack.pop())
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
                keep("stroke")
                commands = []
                stack.clear()
            elif token in ("f", "f*"):
                keep("fill")
                commands = []
                stack.clear()
            elif token[0] in "0123456789+-." or token.startswith("/"):
                stack.append(token)
            else:
                if token in ("n", "W", "W*"):
                    commands = []
                stack.clear()
    return drawings


def slug(text: str) -> str:
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", text.lower())).strip("-")


def main():
    arts = []
    for pdf in sorted(ROOT.rglob("*.pdf")):
        drawings = extract(pdf)
        points = []
        for drawing in drawings:
            for command in drawing["commands"]:
                numbers = command[1:]
                points.extend(zip(numbers[0::2], numbers[1::2]))
        if not points:
            raise SystemExit(f"no artwork in {pdf}")
        pad = max(drawing["width"] for drawing in drawings) / 2 + 0.4
        min_x = min(point[0] for point in points) - pad
        min_y = min(point[1] for point in points) - pad
        max_x = max(point[0] for point in points) + pad
        max_y = max(point[1] for point in points) + pad
        paths = []
        for drawing in drawings:
            parts = []
            for command in drawing["commands"]:
                kind = command[0]
                # PDF y grows upward. SVG y grows downward, so flip y or the drawing is upside down.
                shifted = [value - min_x if index % 2 == 0 else max_y - value for index, value in enumerate(command[1:])]
                if kind == "M":
                    parts.append(f"M{number(shifted[0])} {number(shifted[1])}")
                elif kind == "L":
                    parts.append(f"L{number(shifted[0])} {number(shifted[1])}")
                else:
                    parts.append("C" + " ".join(f"{number(value)}" for value in shifted))
            paths.append(
                {
                    "d": "".join(parts),
                    "fill": drawing["fill"],
                    "stroke": drawing["stroke"],
                    "width": round(drawing["width"], 2),
                }
            )
        relative = pdf.relative_to(ROOT)
        folder = "" if str(relative.parent) == "." else str(relative.parent).replace("\\", "/")
        arts.append(
            {
                "id": slug(str(relative.with_suffix(""))),
                "name": pdf.stem,
                "folder": folder,
                "width": round(max_x - min_x, 2),
                "height": round(max_y - min_y, 2),
                "paths": paths,
            }
        )
        print(f"{len(paths):3d}  {arts[-1]['width']:6.1f} x {arts[-1]['height']:6.1f}  {relative}")

    lines = [
        "/** Vector artwork traced from the PDFs in the MIFA Symbols folders. */",
        "export type ArtPath = { d: string; fill: string | null; stroke: string | null; width: number };",
        "export type SymbolArt = { id: string; name: string; folder: string; width: number; height: number; paths: ArtPath[] };",
        "",
        "export const SYMBOL_ART: SymbolArt[] = [",
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
    lines += [
        "];",
        "",
        "export const ART_BY_ID: Record<string, SymbolArt> = Object.fromEntries(SYMBOL_ART.map((art) => [art.id, art]));",
        "",
        "const TRANSPORT_ART: { test: RegExp; id: string }[] = [",
        '  { test: /forklift\\s*sb\\s*empty/i, id: "materials-forklift-sb-delivery-forklift-sb-empty" },',
        '  { test: /forklift\\s*sb\\s*full/i, id: "materials-forklift-sb-delivery-forklift-sb-full" },',
        '  { test: /tugger\\s*cart|ro-?ro|\\bbr\\b/i, id: "materials-tugger-cart-transfer-br-ro-ro" },',
        '  { test: /tugger/i, id: "materials-tugger-train-transfer-shelf-carts" },',
        '  { test: /sequenc/i, id: "materials-sequenced-cart-transfer" },',
        '  { test: /forklift|cariste/i, id: "materials-forklift-transfer" },',
        '  { test: /push\\s*cart|\\bcart\\b|chariot/i, id: "materials-push-cart-transfer" },',
        '  { test: /\\bagc\\b|\\bagv\\b/i, id: "materials-agc-transfer" },',
        '  { test: /\\bmanual\\b|\\bman\\b|manuel/i, id: "materials-man-transfer" },',
        '  { test: /truck|camion/i, id: "materials-truck-transfer" },',
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
    print("wrote", OUT, "bytes", OUT.stat().st_size)


if __name__ == "__main__":
    main()
