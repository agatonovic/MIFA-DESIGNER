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
  if (symbol === "production") {
    const y = h * 0.1;
    const bh = h * 0.78;
    return (
      <path
        d={`M ${w * 0.04} ${y} H ${w * 0.78} L ${w * 0.96} ${y + bh / 2} L ${w * 0.78} ${y + bh} H ${w * 0.04} Z`}
        fill="#fff"
        stroke={ink}
        strokeWidth={stroke}
      />
    );
  }
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
