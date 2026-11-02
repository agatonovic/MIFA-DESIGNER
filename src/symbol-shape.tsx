import type { SymbolId } from "./document";

const ink = "#202124";

export function SymbolShape({
  symbol,
  width,
  height,
  label,
  selected = false,
  armed = false,
}: {
  symbol: SymbolId;
  width: number;
  height: number;
  label?: string;
  selected?: boolean;
  armed?: boolean;
}) {
  const bodyBottom = label ? height - 22 : height - 2;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <Glyph symbol={symbol} width={width} bottom={bodyBottom} />
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

function Glyph({ symbol, width, bottom }: { symbol: SymbolId; width: number; bottom: number }) {
  const w = width;
  const h = Math.max(24, bottom);
  if (symbol === "stock") {
    return (
      <path
        d={`M ${w / 2} 6 L ${w - 10} ${h - 4} L 10 ${h - 4} Z`}
        fill="#fff"
        stroke={ink}
        strokeWidth={1.6}
      />
    );
  }
  if (symbol === "supplier") {
    const roof = 28;
    let d = `M 3 ${roof}`;
    const span = w - 6;
    for (let i = 0; i < 3; i += 1) {
      const x0 = 3 + (span * i) / 3;
      const x1 = 3 + (span * (i + 0.5)) / 3;
      const x2 = 3 + (span * (i + 1)) / 3;
      d += ` L ${x1} 4 L ${x2} ${roof}`;
    }
    d += ` L ${w - 3} ${h - 3} L 3 ${h - 3} Z`;
    return (
      <g>
        <path d={d} fill="#fff" stroke={ink} strokeWidth={1.6} />
        <rect x={w / 2 - 8} y={h - 20} width={16} height={17} fill="#fff" stroke={ink} strokeWidth={1.3} />
      </g>
    );
  }
  if (symbol === "production") {
    const y = 6;
    const bh = h - 10;
    return (
      <path
        d={`M 3 ${y} H ${w - 22} L ${w - 3} ${y + bh / 2} L ${w - 22} ${y + bh} H 3 Z`}
        fill="#fff"
        stroke={ink}
        strokeWidth={1.6}
      />
    );
  }
  if (symbol === "it") {
    return (
      <g>
        <rect x={3} y={4} width={w - 6} height={h - 8} rx={6} fill="#e8f0fe" stroke={ink} strokeWidth={1.6} />
        <path d={`M 3 18 H ${w - 3}`} stroke={ink} strokeWidth={1.2} />
        <text x={w / 2} y={(h + 22) / 2} textAnchor="middle" fill={ink} fontSize={13} fontFamily="inherit" fontWeight={600}>
          IT
        </text>
      </g>
    );
  }
  const dashed = symbol === "empty";
  return (
    <g>
      <rect
        x={3}
        y={4}
        width={w - 6}
        height={h - 8}
        rx={2}
        fill="#fff"
        stroke={ink}
        strokeWidth={1.6}
        strokeDasharray={dashed ? "5 3" : undefined}
      />
      {symbol === "dock" ? <DockMarks width={w} height={h} /> : null}
      {symbol === "warehouse" ? <ShelfMarks width={w} height={h} /> : null}
      {symbol === "supermarket" ? <LaneMarks width={w} height={h} /> : null}
      {symbol === "kitting" ? <KitMarks width={w} height={h} /> : null}
      {symbol === "sequencing" ? <SequenceMarks width={w} height={h} /> : null}
      {symbol === "empty" ? <EmptyMark width={w} height={h} /> : null}
    </g>
  );
}

function DockMarks({ width, height }: { width: number; height: number }) {
  const y = 12;
  const h = height - 28;
  return <rect x={10} y={y} width={18} height={Math.max(16, h)} fill="none" stroke={ink} strokeWidth={1.3} />;
}

function ShelfMarks({ width, height }: { width: number; height: number }) {
  const left = 12;
  const right = width - 12;
  const rows = [height * 0.38, height * 0.62];
  return (
    <g stroke={ink} strokeWidth={1.2} fill="none">
      {rows.map((y) => (
        <path key={y} d={`M ${left} ${y} H ${right}`} />
      ))}
    </g>
  );
}

function LaneMarks({ width, height }: { width: number; height: number }) {
  const top = 10;
  const bottom = height - 16;
  return (
    <g stroke={ink} strokeWidth={1.15} fill="none">
      {[0.33, 0.66].map((t) => (
        <path key={t} d={`M ${width * t} ${top} V ${bottom}`} />
      ))}
    </g>
  );
}

function KitMarks({ width, height }: { width: number; height: number }) {
  const size = 16;
  const y = Math.max(12, height / 2 - 16);
  const gap = (width - 24 - size * 3) / 2;
  return (
    <g fill="none" stroke={ink} strokeWidth={1.2}>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={12 + i * (size + gap)} y={y} width={size} height={size} />
      ))}
    </g>
  );
}

function SequenceMarks({ width, height }: { width: number; height: number }) {
  const top = 8;
  const bottom = height - 14;
  return (
    <g fill={ink} stroke={ink} fontSize={12} fontFamily="inherit" fontWeight={600}>
      {[1 / 3, 2 / 3].map((t) => (
        <path key={t} d={`M ${width * t} ${top} V ${bottom}`} fill="none" strokeWidth={1.15} />
      ))}
      {["1", "2", "3"].map((n, i) => (
        <text key={n} x={(width * (i + 0.5)) / 3} y={(top + bottom) / 2 + 4} textAnchor="middle" stroke="none">
          {n}
        </text>
      ))}
    </g>
  );
}

function EmptyMark({ width, height }: { width: number; height: number }) {
  return (
    <rect
      x={width / 2 - 16}
      y={14}
      width={32}
      height={Math.max(16, height - 36)}
      fill="none"
      stroke={ink}
      strokeWidth={1.2}
      strokeDasharray="3 2"
    />
  );
}
