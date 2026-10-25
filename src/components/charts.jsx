import { useId, useState } from 'react';
import { cn } from './ui.jsx';
import { formatPercent } from '../lib/format.js';

/* ------------------------------------------------------------ Drop-off curve */

const W = 640;
const H = 270;
const PAD = { left: 36, right: 28, top: 36, bottom: 62 };

const smoothPath = (points) =>
  points.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const mid = (prev.x + point.x) / 2;
    return `${path} C ${mid} ${prev.y}, ${mid} ${point.y}, ${point.x} ${point.y}`;
  }, '');

/** One series, so the heading names it and no legend box is drawn. */
export function DropOffCurve({ stages }) {
  const gradientId = useId();
  const [hover, setHover] = useState(null);

  const max = Math.max(...stages.map((s) => s.count), 1);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const baseY = PAD.top + innerH;
  const points = stages.map((stage, i) => ({
    ...stage,
    x: PAD.left + (stages.length === 1 ? innerW / 2 : (innerW * i) / (stages.length - 1)),
    y: baseY - (stage.count / max) * innerH,
  }));

  const line = smoothPath(points);
  const area = `${line} L ${points.at(-1).x} ${baseY} L ${points[0].x} ${baseY} Z`;
  const active = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Candidates remaining after each stage">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.16" />
            <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
          </linearGradient>
        </defs>

        <line x1={PAD.left} x2={W - PAD.right} y1={baseY} y2={baseY} stroke="rgb(var(--rule-strong))" />
        {points.map((point) => (
          <line key={`g-${point.label}`} x1={point.x} x2={point.x} y1={PAD.top - 8} y2={baseY} stroke="rgb(var(--rule))" strokeDasharray="2 4" />
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth="2"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray="1"
          className="animate-draw-in"
        />

        {points.slice(1).map((point, i) => {
          const lost = points[i].count - point.count;
          if (lost <= 0) return null;
          return (
            <text key={`lost-${point.label}`} x={(points[i].x + point.x) / 2} y={baseY + 18} textAnchor="middle" className="fill-bad font-mono text-[11px]">
              {`-${lost}`}
            </text>
          );
        })}

        {points.map((point, i) => (
          <g key={point.label}>
            <text x={point.x} y={point.y - 12} textAnchor="middle" className="fill-ink font-mono text-[13px] font-medium">
              {point.count}
            </text>
            <circle cx={point.x} cy={point.y} r="4.5" fill="rgb(var(--accent))" stroke="rgb(var(--sheet))" strokeWidth="2" />
            {(point.lines ?? [point.label]).map((text, lineIndex) => (
              <text key={text} x={point.x} y={baseY + 38 + lineIndex * 13} textAnchor="middle" className="fill-ink-2 text-[11px]">
                {text}
              </text>
            ))}
            <circle
              cx={point.x}
              cy={point.y}
              r="18"
              fill="transparent"
              tabIndex={0}
              aria-label={`${point.label}: ${point.count} candidates`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="cursor-pointer outline-none focus-visible:stroke-accent"
              strokeWidth="2"
            />
          </g>
        ))}
      </svg>

      {active && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-ink px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: `${(active.x / W) * 100}%`, top: `${(active.y / H) * 100 - 7}%` }}
        >
          <p className="font-medium">{active.label}</p>
          <p className="figure mt-0.5 text-white/75">
            {active.count} remaining
            {active.carryRate !== null && `, ${formatPercent(active.carryRate)} of the step before`}
          </p>
        </div>
      )}

      <table className="sr-only">
        <caption>Candidates remaining after each stage</caption>
        <tbody>
          {stages.map((s) => (
            <tr key={s.label}>
              <th scope="row">{s.label}</th>
              <td>{s.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------------------------------- Eligibility strip */

/** One square per verified student, in the same position on every row, so a student can be followed down the list. */
export function EligibilityStrip({ cells, label }) {
  return (
    <div
      className="flex flex-wrap gap-[3px]"
      role="img"
      aria-label={`${label}: ${cells.filter((c) => c.eligible).length} of ${cells.length} verified students eligible`}
    >
      {cells.map((cell) => (
        <span
          key={cell.student.student_id}
          title={`${cell.student.name}: ${cell.eligible ? 'eligible' : 'not eligible'}`}
          className={cn('h-4 w-4 rounded-[3px]', cell.eligible ? 'bg-accent' : 'bg-rule')}
        />
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- Demand vs supply */

export function DemandSupply({ rows }) {
  const max = Math.max(...rows.flatMap((r) => [r.demand, r.supply]), 1);
  return (
    <div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-2" aria-hidden="true">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-4 rounded-sm bg-accent" />
          Open roles asking for it
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-4 rounded-sm bg-ink-3" />
          Verified students who have it
        </span>
      </div>
      <table className="mt-4 w-full text-left text-[13px]">
        <caption className="sr-only">Skills required by open roles compared with verified students holding them</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Skill</th>
            <th scope="col">Open roles and students</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.skill} className="border-t border-rule first:border-0">
              <th scope="row" className="w-28 py-2.5 pr-3 align-top font-medium text-ink">
                {row.skill}
              </th>
              <td className="py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 origin-left animate-grow-x rounded-sm bg-accent" style={{ width: `${(row.demand / max) * 80}%` }} />
                  <span className="figure text-xs text-ink">{row.demand}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div
                    className="h-2 origin-left animate-grow-x rounded-sm bg-ink-3"
                    style={{ width: `${(row.supply / max) * 80}%`, minWidth: row.supply ? undefined : 2 }}
                  />
                  <span className="figure text-xs text-ink-2">{row.supply}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
