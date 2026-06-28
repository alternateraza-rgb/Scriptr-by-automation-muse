import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowRight,
  Clock,
  FileText,
  FolderKanban,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import {
  TOPIC_COLORS,
  useDashboardStats,
  type DurationTrendPoint,
  type WeeklyProductionPoint,
} from '../hooks/useDashboardStats'

type DashboardProps = {
  userName?: string
  onOpenGenerate: () => void
  onOpenChat: () => void
  onOpenScripts: () => void
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'rgba(18, 18, 18, 0.96)',
  border: '1px solid #3a3a3a',
  borderRadius: '10px',
  color: '#f5f5f5',
  fontSize: '0.82rem',
}

function WeeklyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={CHART_TOOLTIP_STYLE} className="creator-chart-tooltip">
      <strong>{label}</strong>
      <p>{payload[0].value} scripts</p>
    </div>
  )
}

function DurationTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={CHART_TOOLTIP_STYLE} className="creator-chart-tooltip">
      <strong>{label}</strong>
      <p>{payload[0].value} min avg</p>
    </div>
  )
}

function TopicTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number }>
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={CHART_TOOLTIP_STYLE} className="creator-chart-tooltip">
      <strong>{payload[0].name}</strong>
      <p>{payload[0].value}% of scripts</p>
    </div>
  )
}

function ChartEmptyState({ onAction }: { onAction: () => void }) {
  return (
    <div className="empty-state compact creator-chart-empty">
      <Sparkles className="empty-icon" />
      <h3>Start your first project</h3>
      <p>Generate a script to unlock production stats, trends, and topic insights.</p>
      <button type="button" className="btn primary" onClick={onAction}>
        Open Generate Journey
      </button>
    </div>
  )
}

function formatKpiValue(value: number, isLoading: boolean) {
  if (isLoading) {
    return '—'
  }
  return value
}

export function Dashboard({ userName, onOpenGenerate, onOpenChat, onOpenScripts }: DashboardProps) {
  const { kpis, weeklyProduction, durationTrends, topicDistribution, isLoading, isEmpty } = useDashboardStats()

  const pieData = topicDistribution.map((item) => ({
    name: item.topic,
    value: item.percentage,
  }))

  return (
    <section className="creator-hub menu-transition-surface">
      <header className="creator-hub-header">
        <div>
          <p className="eyebrow">Creator Hub</p>
          <h1>Welcome back, {userName || 'Creator'}</h1>
          <p>Your production pulse, trends, and quick actions in one place.</p>
        </div>
        <button type="button" className="btn primary large creator-hub-cta" onClick={onOpenGenerate}>
          <Sparkles className="icon-inline" />
          Open Generate Journey
          <ArrowRight className="icon-inline" />
        </button>
      </header>

      <div className="creator-kpi-row">
        <article className="creator-bento creator-kpi-card">
          <div className="creator-kpi-icon">
            <FileText />
          </div>
          <div>
            <span>Total Scripts</span>
            <strong>{formatKpiValue(kpis.totalScripts, isLoading)}</strong>
            <small>This month</small>
          </div>
        </article>
        <article className="creator-bento creator-kpi-card">
          <div className="creator-kpi-icon">
            <Clock />
          </div>
          <div>
            <span>Average Duration</span>
            <strong>{isLoading ? '—' : `${kpis.averageDurationMinutes} min`}</strong>
            <small>Per script</small>
          </div>
        </article>
        <article className="creator-bento creator-kpi-card">
          <div className="creator-kpi-icon">
            <FolderKanban />
          </div>
          <div>
            <span>Active Projects</span>
            <strong>{formatKpiValue(kpis.activeProjects, isLoading)}</strong>
            <small>In progress</small>
          </div>
        </article>
      </div>

      <div className="creator-bento-grid">
        <article className="creator-bento creator-chart-card creator-chart-wide">
          <div className="creator-card-head">
            <h3>Weekly Production</h3>
            <p>Scripts generated per week this month</p>
          </div>
          <div className="creator-chart-wrap">
            {isEmpty && !isLoading ? (
              <ChartEmptyState onAction={onOpenGenerate} />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={weeklyProduction as WeeklyProductionPoint[]} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: '#a8a8a8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#a8a8a8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<WeeklyTooltip />} cursor={{ fill: 'rgba(255, 51, 71, 0.08)' }} />
                  <Bar dataKey="scripts" radius={[8, 8, 0, 0]} fill="url(#weeklyBarGradient)" maxBarSize={48} />
                  <defs>
                    <linearGradient id="weeklyBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff3347" />
                      <stop offset="100%" stopColor="#e11d2e" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="creator-bento creator-chart-card">
          <div className="creator-card-head">
            <h3>Duration Trends</h3>
            <p>Avg script length over 30 days</p>
          </div>
          <div className="creator-chart-wrap">
            {isEmpty && !isLoading ? (
              <ChartEmptyState onAction={onOpenGenerate} />
            ) : durationTrends.length === 0 && !isLoading ? (
              <ChartEmptyState onAction={onOpenGenerate} />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={durationTrends as DurationTrendPoint[]} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#a8a8a8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    tick={{ fill: '#a8a8a8', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    unit="m"
                    domain={['auto', 'auto']}
                  />
                  <Tooltip content={<DurationTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="avgMinutes"
                    stroke="#ff3347"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#ff3347', stroke: '#1a1a1a', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="creator-bento creator-chart-card creator-topic-card">
          <div className="creator-card-head">
            <h3>Topic Distribution</h3>
            <p>Top categories this month</p>
          </div>
          <div className="creator-topic-layout">
            {isEmpty && !isLoading ? (
              <ChartEmptyState onAction={onOpenGenerate} />
            ) : topicDistribution.length === 0 && !isLoading ? (
              <ChartEmptyState onAction={onOpenGenerate} />
            ) : (
              <>
                <div className="creator-topic-chart">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={42}
                        outerRadius={68}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={pieData[index].name} fill={TOPIC_COLORS[index % TOPIC_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<TopicTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="creator-topic-list">
                  {topicDistribution.map((item, index) => (
                    <li key={item.topic}>
                      <span className="creator-topic-swatch" style={{ background: TOPIC_COLORS[index % TOPIC_COLORS.length] }} />
                      <div>
                        <strong>{item.topic}</strong>
                        <small>{item.count} scripts · {item.percentage}%</small>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </article>

        <article className="creator-bento creator-actions-card">
          <div className="creator-card-head">
            <h3>Quick Actions</h3>
            <p>Jump into your workflow</p>
          </div>
          <div className="creator-action-grid">
            <button type="button" className="creator-action-card" onClick={onOpenChat}>
              <span className="creator-action-icon">
                <MessageSquare />
              </span>
              <div>
                <strong>Ask Assistant</strong>
                <p>General Chat — brainstorm ideas and get strategy help.</p>
              </div>
              <ArrowRight className="creator-action-arrow" />
            </button>
            <button type="button" className="creator-action-card" onClick={onOpenScripts}>
              <span className="creator-action-icon">
                <FileText />
              </span>
              <div>
                <strong>Manage Drafts</strong>
                <p>My Scripts — review, edit, and polish saved drafts.</p>
              </div>
              <ArrowRight className="creator-action-arrow" />
            </button>
          </div>
        </article>
      </div>
    </section>
  )
}
