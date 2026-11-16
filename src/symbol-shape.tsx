import { useId } from "react";
import type { SymbolId } from "./document";
import { LINE_CAR } from "./line-car";
import { artBounds, type ArtPath, type SymbolArt } from "./symbol-art";

const ink = "#202124";
/** Sheet pixels. The same weight as a flow line, and it stays that weight when a symbol is resized. */
const PEN = 1.7;
/** Old production line, top to bottom: three red, three green, three teal, one grey, then the same again. */
export const SEQUENCE_COLORS = ["#d80000", "#d80000", "#d80000", "#3ff200", "#3ff200", "#3ff200", "#009999", "#009999", "#009999", "#969696"];
/** Old production line in batches, top to bottom, then the same five again. */
export const BATCH_COLORS = ["#d80000", "#3ff200", "#666633", "#009999", "#969696"];
const PART_FILL = { outline: "#000000", lamp: "#ffe500", wheel: "#000000", hub: "#7f99b2", window: "#ffffff" };

export type LinePattern = "sequence" | "batch";

export function linePattern(artwork?: string): LinePattern | null {
  if (artwork === "process-production-line-in-batches") return "batch";
  if (artwork === "process-production-line-in-sequences") return "sequence";
  return null;
}

/** Rails and one car. The rails match the other symbols' line weight, and height never changes the car size. */
export function productionLineMetrics(width: number) {
  const left = PEN;
  const right = PEN;
  const gap = Math.max(0, width - left - right);
  const carW = gap * 0.94;
  const carH = carW * (LINE_CAR.height / LINE_CAR.width);
  const pitch = carH * 1.12;
  return { left, right, gap, carW, carH, pitch };
}

/** One copy of the old symbol: ten cars between the rails. */
export function productionLineBox(width = 48) {
  const { pitch } = productionLineMetrics(width);
  return { width, height: Math.round(pitch * 10) };
}

export function SymbolShape({
  symbol,
  width,
  height,
  label,
  pose,
  selected = false,
  armed = false,
}: {
  symbol: SymbolId;
  width: number;
  height: number;
  label?: string;
  pose?: { flip?: boolean; turn?: number };
  selected?: boolean;
  armed?: boolean;
}) {
  const bodyBottom = label ? height - 22 : height - 2;
  const turn = pose?.turn ?? 0;
  const sideways = turn === 90 || turn === 270;
  const glyphWidth = sideways ? bodyBottom : width;
  const glyphHeight = sideways ? width : bodyBottom;
  const flip = pose?.flip ? -1 : 1;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {turn || pose?.flip ? (
        <g transform={`translate(${width / 2} ${bodyBottom / 2}) rotate(${turn}) scale(${flip} 1) translate(${-glyphWidth / 2} ${-glyphHeight / 2})`}>
          <Glyph symbol={symbol} width={glyphWidth} bottom={glyphHeight} />
        </g>
      ) : (
        <Glyph symbol={symbol} width={width} bottom={bodyBottom} />
      )}
      {label ? (
        <text
          x={width / 2}
          y={height - 7}
          textAnchor="middle"
          fill={ink}
          fontSize={label.length > 16 ? 11 : 12}
          fontFamily="inherit"
          fontWeight={500}
        >
          {label}
        </text>
      ) : null}
      {selected || armed ? (
        <rect
          x={1}
          y={1}
          width={Math.max(0, width - 2)}
          height={Math.max(0, height - 2)}
          rx={3}
          fill="none"
          stroke="#1b4f9c"
          strokeWidth={selected ? 1.75 : 1.25}
          strokeDasharray={armed && !selected ? "4 3" : undefined}
        />
      ) : null}
    </svg>
  );
}

function sizedArrow(d: string, factor: number) {
  if (!Number.isFinite(factor) || Math.abs(factor - 1) < 0.04) return d;
  const nums = d.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 2) return d;
  const originX = Number(nums[0]);
  const originY = Number(nums[1]);
  let index = 0;
  return d.replace(/-?\d+(?:\.\d+)?/g, (token) => {
    const value = Number(token);
    const next = index % 2 === 0 ? originX + (value - originX) * factor : originY + (value - originY) * factor;
    index += 1;
    return String(Math.round(next * 10) / 10);
  });
}

/** Six teeth, a little taller than the first short roof, and the count does not grow when the building does. */
const SUPPLIER_TEETH = 6;
const SUPPLIER_TOOTH_HEIGHT = 14;

function trim(value: number) {
  return Math.round(value * 10) / 10;
}

/** The same six sawteeth span the building. Extra width widens them. Extra height lengthens the walls. */
function supplierRoof(width: number, height: number) {
  const right = Math.max(0, width);
  const bottom = Math.max(0, height);
  const roof = Math.min(SUPPLIER_TOOTH_HEIGHT, bottom);
  const tooth = right / SUPPLIER_TEETH;
  const points = [`M 0 ${trim(roof)}`];
  for (let index = 1; index <= SUPPLIER_TEETH; index += 1) {
    const x = index * tooth;
    points.push(`L ${trim(x)} 0`);
    points.push(`L ${trim(x)} ${trim(roof)}`);
  }
  points.push(`L ${trim(right)} ${trim(bottom)}`);
  points.push(`L 0 ${trim(bottom)}Z`);
  return points.join("");
}

/** Stroke stays the line weight at normal size, and thins with the symbol so the fill stays visible. */
function fittedPen(width: number, height: number) {
  const shortSide = Math.max(1, Math.min(width, height));
  return Math.min(PEN, Math.max(0.35, (shortSide / 28) * PEN));
}

/** Stroke divided by the short side of one cell on a standalone small-box pallet. */
const PALLET_BOX_STROKE = 7372.3 / 87677.5;
const FORKLIFT_BOXES = new Set(["materials-forklift-sb-full", "materials-forklift-sb-empty"]);

function axisRect(d: string) {
  const nums = d.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 8 || nums.length > 10) return null;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let index = 0; index + 1 < nums.length; index += 2) {
    xs.push(Number(nums[index]));
    ys.push(Number(nums[index + 1]));
  }
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  return width > 0 && height > 0 ? { width, height } : null;
}

function isCarriedBox(art: SymbolArt, path: ArtPath) {
  if (!FORKLIFT_BOXES.has(art.id)) return false;
  if (!path.fill) return Boolean(path.stroke);
  const rect = axisRect(path.d);
  if (!rect) return false;
  const bounds = artBounds(art);
  const minor = Math.min(rect.width, rect.height);
  const major = Math.max(rect.width, rect.height);
  return minor / major >= 0.45 && minor <= Math.min(bounds.width, bounds.height) * 0.25;
}

/** Box lines on the forklift, in the drawing's own units. The truck keeps its own line weight. */
export function carriedCellStroke(art: SymbolArt) {
  if (!FORKLIFT_BOXES.has(art.id)) return null;
  let short = 0;
  for (const path of art.paths) {
    if (!isCarriedBox(art, path) || !path.fill) continue;
    const rect = axisRect(path.d);
    if (!rect) continue;
    short = Math.max(short, Math.min(rect.width, rect.height));
  }
  return short > 0 ? short * PALLET_BOX_STROKE : null;
}

export function VectorArt({ art, width, height, selected = false }: { art: SymbolArt; width: number; height: number; selected?: boolean }) {
  if (art.id === "process-supplier") {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${Math.max(width, 1)} ${Math.max(height, 1)}`} className="overflow-visible">
        <path d={supplierRoof(width, height)} fill="none" stroke="#000000" strokeWidth={fittedPen(width, height)} strokeLinejoin="round" strokeLinecap="round" />
        {selected ? <rect x={0} y={0} width={Math.max(0, width)} height={Math.max(0, height)} fill="none" stroke="#1b4f9c" strokeWidth={PEN} /> : null}
      </svg>
    );
  }
  const bounds = artBounds(art);
  const unit = Math.min(width / Math.max(bounds.width, 1), height / Math.max(bounds.height, 1)) || 1;
  const pen = fittedPen(width, height) / unit;
  const cellPen = carriedCellStroke(art);
  const base = import.meta.env.BASE_URL;
  return (
    <svg width={width} height={height} viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`} preserveAspectRatio="none" className="overflow-visible">
      {art.images?.map((image, index) => (
        <image key={`image-${index}`} href={`${base}${image.href}`} x={image.x} y={image.y} width={image.width} height={image.height} />
      ))}
      {art.paths.map((path, index) => (
        <path
          key={index}
          d={path.arrow ? sizedArrow(path.d, pen / path.arrow) : path.d}
          fill={path.fill ?? "none"}
          stroke={path.stroke ?? "none"}
          strokeWidth={path.stroke ? Math.min(path.width > 0 ? path.width : pen, pen, cellPen !== null && isCarriedBox(art, path) ? cellPen : Infinity) : undefined}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {selected ? <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill="none" stroke="#1b4f9c" strokeWidth={pen} /> : null}
    </svg>
  );
}

function Glyph({ symbol, width, bottom }: { symbol: SymbolId; width: number; bottom: number }) {
  const w = width;
  const h = Math.max(24, bottom);
  const stroke = Math.max(1.25, Math.min(1.8, w / 80));
  if (symbol === "stock") {
    return (
      <path
        d={`M ${w / 2} ${h * 0.08} L ${w * 0.9} ${h * 0.92} L ${w * 0.1} ${h * 0.92} Z`}
        fill="#fff"
        stroke={ink}
        strokeWidth={stroke}
      />
    );
  }
  if (symbol === "supplier") {
    const roof = h * 0.36;
    let d = `M ${w * 0.04} ${roof}`;
    for (let i = 0; i < 3; i += 1) {
      const x1 = w * (0.04 + (0.92 * (i + 0.5)) / 3);
      const x2 = w * (0.04 + (0.92 * (i + 1)) / 3);
      d += ` L ${x1} ${h * 0.06} L ${x2} ${roof}`;
    }
    d += ` L ${w * 0.96} ${h * 0.94} L ${w * 0.04} ${h * 0.94} Z`;
    const doorW = w * 0.14;
    const doorH = h * 0.22;
    return (
      <g>
        <path d={d} fill="#fff" stroke={ink} strokeWidth={stroke} />
        <rect x={(w - doorW) / 2} y={h * 0.94 - doorH} width={doorW} height={doorH} fill="#fff" stroke={ink} strokeWidth={stroke * 0.85} />
      </g>
    );
  }
  if (symbol === "production") return <ProductionLine width={w} height={h} />;
  if (symbol === "it") {
    return (
      <g>
        <rect x={w * 0.04} y={h * 0.08} width={w * 0.92} height={h * 0.84} rx={Math.min(8, w * 0.08)} fill="#e8f0fe" stroke={ink} strokeWidth={stroke} />
        <path d={`M ${w * 0.04} ${h * 0.32} H ${w * 0.96}`} stroke={ink} strokeWidth={stroke * 0.8} />
        <text x={w / 2} y={h * 0.68} textAnchor="middle" fill={ink} fontSize={Math.max(9, h * 0.28)} fontFamily="inherit" fontWeight={600}>
          IT
        </text>
      </g>
    );
  }
  const dashed = symbol === "empty";
  return (
    <g>
      <rect
        x={w * 0.04}
        y={h * 0.08}
        width={w * 0.92}
        height={h * 0.84}
        rx={2}
        fill="#fff"
        stroke={ink}
        strokeWidth={stroke}
        strokeDasharray={dashed ? "5 3" : undefined}
      />
      {symbol === "dock" ? <DockMarks width={w} height={h} stroke={stroke} /> : null}
      {symbol === "warehouse" ? <ShelfMarks width={w} height={h} stroke={stroke} /> : null}
      {symbol === "supermarket" ? <LaneMarks width={w} height={h} stroke={stroke} /> : null}
      {symbol === "kitting" ? <KitMarks width={w} height={h} stroke={stroke} /> : null}
      {symbol === "sequencing" ? <SequenceMarks width={w} height={h} stroke={stroke} /> : null}
      {symbol === "empty" ? <EmptyMark width={w} height={h} stroke={stroke} /> : null}
    </g>
  );
}

export function ProductionLine({
  width,
  height,
  pattern = "sequence",
  frame = false,
}: {
  width: number;
  height: number;
  pattern?: LinePattern;
  frame?: boolean;
}) {
  const clipId = useId().replace(/:/g, "");
  const { left, right, gap, carW, carH, pitch } = productionLineMetrics(width);
  const colors = pattern === "batch" ? BATCH_COLORS : SEQUENCE_COLORS;
  const count = Math.max(1, Math.ceil(Math.max(height, 1) / Math.max(pitch, 1)));
  const sx = carW / LINE_CAR.width;
  const sy = carH / LINE_CAR.height;
  return (
    <g>
      <rect x={0} y={0} width={left} height={height} fill="#000" />
      <rect x={width - right} y={0} width={right} height={height} fill="#000" />
      <clipPath id={clipId}>
        <rect x={0} y={0} width={width} height={height} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {Array.from({ length: count }, (_, index) => (
          <g key={index} transform={`translate(${left + (gap - carW) / 2} ${pitch * index + (pitch - carH) / 2}) scale(${sx} ${sy})`}>
            {LINE_CAR.parts.map((part, partIndex) => (
              <path key={partIndex} d={part.d} fill={part.role === "body" ? colors[index % colors.length] : PART_FILL[part.role]} />
            ))}
          </g>
        ))}
      </g>
      {frame ? (
        <rect x={0.8} y={0.8} width={Math.max(0, width - 1.6)} height={Math.max(0, height - 1.6)} fill="none" stroke="#1b4f9c" strokeWidth={1.7} />
      ) : null}
    </g>
  );
}

export function ProductionLineArt({
  width,
  height,
  pattern = "sequence",
  frame = false,
}: {
  width: number;
  height: number;
  pattern?: LinePattern;
  frame?: boolean;
}) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <ProductionLine width={width} height={height} pattern={pattern} frame={frame} />
    </svg>
  );
}

function DockMarks({ width, height, stroke }: { width: number; height: number; stroke: number }) {
  return <rect x={width * 0.14} y={height * 0.22} width={width * 0.22} height={height * 0.5} fill="none" stroke={ink} strokeWidth={stroke * 0.85} />;
}

function ShelfMarks({ width, height, stroke }: { width: number; height: number; stroke: number }) {
  const left = width * 0.14;
  const right = width * 0.86;
  return (
    <g stroke={ink} strokeWidth={stroke * 0.8} fill="none">
      {[0.4, 0.64].map((t) => (
        <path key={t} d={`M ${left} ${height * t} H ${right}`} />
      ))}
    </g>
  );
}

function LaneMarks({ width, height, stroke }: { width: number; height: number; stroke: number }) {
  return (
    <g stroke={ink} strokeWidth={stroke * 0.75} fill="none">
      {[0.38, 0.62].map((t) => (
        <path key={t} d={`M ${width * t} ${height * 0.18} V ${height * 0.78}`} />
      ))}
    </g>
  );
}

function KitMarks({ width, height, stroke }: { width: number; height: number; stroke: number }) {
  const size = width * 0.16;
  const gap = width * 0.06;
  const total = size * 3 + gap * 2;
  const x0 = (width - total) / 2;
  const y = height * 0.34;
  return (
    <g fill="none" stroke={ink} strokeWidth={stroke * 0.8}>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={x0 + i * (size + gap)} y={y} width={size} height={size} />
      ))}
    </g>
  );
}

function SequenceMarks({ width, height, stroke }: { width: number; height: number; stroke: number }) {
  const top = height * 0.16;
  const bottom = height * 0.82;
  return (
    <g fill={ink} fontSize={Math.max(8, height * 0.28)} fontFamily="inherit" fontWeight={600}>
      {[1 / 3, 2 / 3].map((t) => (
        <path key={t} d={`M ${width * t} ${top} V ${bottom}`} fill="none" stroke={ink} strokeWidth={stroke * 0.7} />
      ))}
      {["1", "2", "3"].map((n, i) => (
        <text key={n} x={(width * (i + 0.5)) / 3} y={(top + bottom) / 2 + height * 0.08} textAnchor="middle">
          {n}
        </text>
      ))}
    </g>
  );
}

function EmptyMark({ width, height, stroke }: { width: number; height: number; stroke: number }) {
  const boxW = width * 0.36;
  const boxH = height * 0.4;
  return (
    <rect
      x={(width - boxW) / 2}
      y={(height - boxH) / 2}
      width={boxW}
      height={boxH}
      fill="none"
      stroke={ink}
      strokeWidth={stroke * 0.8}
      strokeDasharray="3 2"
    />
  );
}
