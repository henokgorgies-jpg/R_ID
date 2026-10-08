'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const defaultTooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border) / 0.85)',
  borderRadius: '12px',
};

function RadialMeter({
  value,
  label,
  sublabel,
  color,
  trackColor,
}: {
  value: number;
  label: string;
  sublabel?: string;
  color: string;
  trackColor: string;
}) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative h-[116px] w-[116px] rounded-full p-[10px]"
        style={{ background: `conic-gradient(${color} ${safe}%, ${trackColor} ${safe}% 100%)` }}
      >
        <div className="flex h-full w-full items-center justify-center rounded-full border border-white/70 bg-white/80 backdrop-blur-sm">
          <p className="text-xl font-bold tracking-[-0.02em] text-slate-900">{safe.toFixed(1)}%</p>
        </div>
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {sublabel && <p className="text-xs text-slate-600">{sublabel}</p>}
      </div>
    </div>
  );
}

function LegendChips({
  items,
}: {
  items: Array<{ label: string; color: string }>;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-medium"
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

// -------------------- Population Trend Chart --------------------

interface PopulationTrendData {
  month: string;
  registrations: number;
  transfers_in: number;
  transfers_out: number;
  deaths: number;
}

interface PopulationTrendChartProps {
  data: PopulationTrendData[];
}

export function PopulationTrendChart({ data }: PopulationTrendChartProps) {
  const TREND_PRIMARY = "#60A5FA"; // light blue
  const TREND_SECONDARY = "#22C55E"; // green
  const TREND_TERTIARY = "#F59E0B"; // amber
  const TREND_DANGER = "#F43F5E"; // rose
  const ordered = useMemo(
    () => [...data].sort((a, b) => a.month.localeCompare(b.month)),
    [data],
  );
  const trendMetrics = useMemo(() => {
    const totals = ordered.reduce(
      (acc, row) => {
        acc.registrations += row.registrations;
        acc.transfersIn += row.transfers_in;
        acc.transfersOut += row.transfers_out;
        acc.deaths += row.deaths;
        return acc;
      },
      { registrations: 0, transfersIn: 0, transfersOut: 0, deaths: 0 },
    );
    const net = totals.registrations + totals.transfersIn - totals.transfersOut - totals.deaths;
    const latest = ordered[ordered.length - 1];
    const prev = ordered[ordered.length - 2];
    const monthDelta = latest && prev ? latest.registrations - prev.registrations : 0;
    return { totals, net, latest, monthDelta };
  }, [ordered]);

  const formatMonth = (month: string) => {
    if (!/^\d{4}-\d{2}$/.test(month)) return month;
    const [y, m] = month.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, 1));
    return date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <Card className="col-span-full overflow-hidden border-slate-300/80 bg-[linear-gradient(130deg,hsl(var(--background))_0%,hsl(var(--background))_48%,rgba(56,189,248,0.08)_78%,rgba(16,185,129,0.08)_100%)] lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle>Population Trends</CardTitle>
        <CardDescription>Monthly registration, transfer movement, and mortality signals</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-sky-300/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.84),rgba(219,234,254,0.72))] p-3 shadow-[0_12px_26px_-22px_rgba(37,99,235,0.9)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-700">Registrations</p>
            <p className="mt-1 text-xl font-bold tracking-[-0.02em] text-slate-900">{trendMetrics.totals.registrations.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-emerald-300/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.84),rgba(209,250,229,0.72))] p-3 shadow-[0_12px_26px_-22px_rgba(5,150,105,0.8)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">Net Growth</p>
            <p className="mt-1 text-xl font-bold tracking-[-0.02em] text-slate-900">{trendMetrics.net.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-amber-300/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.84),rgba(254,243,199,0.72))] p-3 shadow-[0_12px_26px_-22px_rgba(245,158,11,0.85)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">Transfers Out</p>
            <p className="mt-1 text-xl font-bold tracking-[-0.02em] text-slate-900">{trendMetrics.totals.transfersOut.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-rose-300/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.84),rgba(255,228,230,0.72))] p-3 shadow-[0_12px_26px_-22px_rgba(244,63,94,0.9)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-rose-700">Last Month Δ</p>
            <p className="mt-1 text-xl font-bold tracking-[-0.02em] text-slate-900">
              {trendMetrics.monthDelta >= 0 ? '+' : ''}
              {trendMetrics.monthDelta.toLocaleString()}
            </p>
          </div>
        </div>
        <LegendChips
          items={[
            { label: 'Registrations', color: TREND_PRIMARY },
            { label: 'Transfers In', color: TREND_SECONDARY },
            { label: 'Transfers Out', color: TREND_TERTIARY },
            { label: 'Deaths', color: TREND_DANGER },
          ]}
        />
        <div className="h-[340px] rounded-xl border border-slate-300/65 bg-white/70 p-2 backdrop-blur-sm">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={ordered}>
              <defs>
                <linearGradient id="grad-registrations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={TREND_PRIMARY} stopOpacity={0.55} />
                  <stop offset="95%" stopColor={TREND_PRIMARY} stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="grad-transfers-in" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={TREND_SECONDARY} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={TREND_SECONDARY} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 6" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" tickFormatter={formatMonth} />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={defaultTooltipStyle}
                labelFormatter={(label) => `Month: ${formatMonth(String(label))}`}
                formatter={(value: number) => value.toLocaleString()}
              />
              <Area
                type="monotone"
                dataKey="registrations"
                stroke={TREND_PRIMARY}
                fill="url(#grad-registrations)"
                strokeWidth={2.3}
                name="Registrations"
              />
              <Area
                type="monotone"
                dataKey="transfers_in"
                stroke={TREND_SECONDARY}
                fill="url(#grad-transfers-in)"
                strokeWidth={2.1}
                name="Transfers In"
              />
              <Line
                type="monotone"
                dataKey="transfers_out"
                stroke={TREND_TERTIARY}
                strokeWidth={2}
                dot={false}
                name="Transfers Out"
              />
              <Line
                type="monotone"
                dataKey="deaths"
                stroke={TREND_DANGER}
                strokeWidth={1.9}
                strokeDasharray="4 4"
                dot={false}
                name="Deaths"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {trendMetrics.latest && (
          <div className="rounded-xl border border-slate-300/60 bg-white/70 px-3.5 py-2.5 text-xs text-slate-600 backdrop-blur-sm">
            Latest period: <span className="font-semibold text-slate-800">{formatMonth(trendMetrics.latest.month)}</span>
            {' '}with{' '}
            <span className="font-semibold text-slate-800">{trendMetrics.latest.registrations.toLocaleString()}</span>
            {' '}registrations.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// -------------------- Age Distribution Chart --------------------

interface AgeDistributionData {
  ageGroup: string;
  male: number;
  female: number;
}

interface AgeDistributionChartProps {
  data: AgeDistributionData[];
}

export function AgeDistributionChart({ data }: AgeDistributionChartProps) {
  const total = data.reduce((sum, row) => sum + row.male + row.female, 0);
  const agePalette = [
    { ring: '#2563EB', track: '#DBEAFE', card: 'border-sky-300/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.85),rgba(219,234,254,0.7))]' },
    { ring: '#0EA5E9', track: '#E0F2FE', card: 'border-cyan-300/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.85),rgba(224,242,254,0.72))]' },
    { ring: '#10B981', track: '#D1FAE5', card: 'border-emerald-300/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.85),rgba(209,250,229,0.7))]' },
    { ring: '#F59E0B', track: '#FEF3C7', card: 'border-amber-300/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.85),rgba(254,243,199,0.72))]' },
  ] as const;

  return (
    <Card className="border-slate-300/80 bg-[linear-gradient(125deg,hsl(var(--background))_0%,hsl(var(--background))_48%,rgba(56,189,248,0.08)_75%,rgba(16,185,129,0.08)_100%)]">
      <CardHeader className="pb-3">
        <CardTitle>Age Distribution</CardTitle>
        <CardDescription>Radial cohort share with male/female split per age band</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((row, index) => {
            const itemTotal = row.male + row.female;
            const share = total > 0 ? (itemTotal / total) * 100 : 0;
            const maleShare = itemTotal > 0 ? (row.male / itemTotal) * 100 : 0;
            const femaleShare = 100 - maleShare;
            const colors = agePalette[index % agePalette.length];
            return (
              <div key={row.ageGroup} className={`rounded-xl border p-3.5 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.85)] backdrop-blur-sm ${colors.card}`}>
                <div className="flex items-center justify-between gap-3">
                  <RadialMeter
                    value={share}
                    label={`Age ${row.ageGroup}`}
                    sublabel={`${itemTotal.toLocaleString()} residents`}
                    color={colors.ring}
                    trackColor={colors.track}
                  />
                  <div className="min-w-[120px] space-y-1.5 text-xs">
                    <div>
                      <p className="font-semibold text-sky-700">Male</p>
                      <p className="text-slate-700">{row.male.toLocaleString()} ({maleShare.toFixed(1)}%)</p>
                    </div>
                    <div>
                      <p className="font-semibold text-rose-700">Female</p>
                      <p className="text-slate-700">{row.female.toLocaleString()} ({femaleShare.toFixed(1)}%)</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="rounded-xl border border-slate-300/60 bg-white/70 px-3.5 py-2.5 text-xs text-slate-600 backdrop-blur-sm">
          Total population represented: <span className="font-semibold text-slate-800">{total.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// -------------------- Gender Distribution Pie Chart --------------------

interface GenderDistributionProps {
  male?: number;
  female?: number;
  maleCount?: number;
  femaleCount?: number;
}

export function GenderDistributionChart({
  male,
  female,
  maleCount,
  femaleCount,
}: GenderDistributionProps) {
  const safeMale = male ?? maleCount ?? 0;
  const safeFemale = female ?? femaleCount ?? 0;
  const total = safeMale + safeFemale;
  const malePct = total > 0 ? (safeMale / total) * 100 : 0;
  const femalePct = total > 0 ? (safeFemale / total) * 100 : 0;
  const ratioText =
    safeFemale > 0
      ? `${(safeMale / safeFemale).toFixed(2)} : 1`
      : safeMale > 0
        ? 'N/A'
        : '0 : 0';
  const dominantLabel = malePct === femalePct ? 'Balanced Split' : malePct > femalePct ? 'Male Dominant' : 'Female Dominant';

  return (
    <Card className="overflow-hidden border-slate-300/80 bg-[linear-gradient(130deg,hsl(var(--background))_0%,hsl(var(--background))_40%,rgba(59,130,246,0.07)_72%,rgba(244,63,94,0.08)_100%)]">
      <CardHeader className="pb-3">
        <div>
          <CardTitle>Sex Distribution</CardTitle>
          <CardDescription>Radial pair presentation with ratio-focused comparison</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-sky-300/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.84),rgba(219,234,254,0.72))] p-4 shadow-[0_14px_30px_-24px_rgba(37,99,235,0.9)] backdrop-blur-sm">
            <RadialMeter
              value={malePct}
              label="Male"
              sublabel={`${safeMale.toLocaleString()} residents`}
              color="#2563EB"
              trackColor="#DBEAFE"
            />
          </div>
          <div className="rounded-xl border border-rose-300/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.84),rgba(255,228,236,0.72))] p-4 shadow-[0_14px_30px_-24px_rgba(244,63,94,0.95)] backdrop-blur-sm">
            <RadialMeter
              value={femalePct}
              label="Female"
              sublabel={`${safeFemale.toLocaleString()} residents`}
              color="#E11D48"
              trackColor="#FFE4E6"
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-300/55 bg-[linear-gradient(145deg,rgba(255,255,255,0.82),rgba(241,245,249,0.72))] p-4 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.8)] backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">Ratio</p>
            <p className="mt-1 text-2xl font-bold tracking-[-0.02em] text-slate-900">{ratioText}</p>
            <p className="text-xs text-slate-600">{dominantLabel}</p>
          </div>
          <div className="rounded-xl border border-slate-300/55 bg-[linear-gradient(145deg,rgba(255,255,255,0.82),rgba(241,245,249,0.72))] p-4 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.8)] backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">Total Population</p>
            <p className="mt-1 text-2xl font-bold tracking-[-0.02em] text-slate-900">{total.toLocaleString()}</p>
            <p className="text-xs text-slate-600">Residents in current comparison scope</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// -------------------- Zone/Woreda Comparison Chart --------------------

interface LocationComparisonData {
  name: string;
  population: number;
  households: number;
}

interface LocationComparisonChartProps {
  data: LocationComparisonData[];
  title: string;
  description?: string;
}

export function LocationComparisonChart({ data, title, description }: LocationComparisonChartProps) {
  const POPULATION_COLOR = "#60A5FA";
  const HOUSEHOLD_COLOR = "#14B8A6";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <LegendChips
          items={[
            { label: 'Population', color: POPULATION_COLOR },
            { label: 'Households', color: HOUSEHOLD_COLOR },
          ]}
        />
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={defaultTooltipStyle}
                formatter={(value: number) => value.toLocaleString()}
              />
              <Bar dataKey="population" fill={POPULATION_COLOR} name="Population" />
              <Bar dataKey="households" fill={HOUSEHOLD_COLOR} name="Households" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// -------------------- Recent Activity List --------------------

interface Activity {
  id: string;
  action: string;
  subject: string;
  time: string;
  type: 'registration' | 'transfer' | 'id_issue' | 'update' | 'duplicate';
}

interface RecentActivityProps {
  activities?: Activity[];
}

const activityTypeColors: Record<Activity['type'], string> = {
  registration: 'bg-green-500',
  transfer: 'bg-blue-500',
  id_issue: 'bg-amber-500',
  update: 'bg-gray-500',
  duplicate: 'bg-red-500',
};

export function RecentActivityList({ activities = [] }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest system activities</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={`mt-1.5 h-2 w-2 rounded-full ${activityTypeColors[activity.type]}`} />
              <div className="flex-1 space-y-1">
                <p className="text-sm leading-none">{activity.action}</p>
                <p className="text-xs text-muted-foreground">{activity.subject}</p>
              </div>
              <span className="text-xs text-muted-foreground">{activity.time}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Backward-compatible chart exports used by older pages.
export const RecentActivityChart = RecentActivityList;
export const ComplianceChart = RecentActivityList;
export const RegistrationTrendChart = PopulationTrendChart;
export const PopulationPyramidChart = AgeDistributionChart;
