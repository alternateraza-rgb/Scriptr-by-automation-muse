import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'
import {
  generateTitles as requestTitles,
  generateIdeas as requestIdeas,
  generateOutline as requestOutline,
  generateScript as requestScript,
  polishScript as requestPolishScript,
} from '../services/scriptGenerationService'
import type {
  ChannelContext,
  GeneratedScript,
  TitlePayload,
  OutlineSection,
  VideoIdea,
} from '../services/types'
import { authService } from '../services/data/authService'
import { profileService } from '../services/data/profileService'
import { onboardingService } from '../services/data/onboardingService'
import { channelProfileService } from '../services/data/channelProfileService'
import { scriptService } from '../services/data/scriptService'
import { usageStatsService } from '../services/data/usageStatsService'
import type { ChannelProfileRow, OnboardingResponseRow, ScriptRow, UsageStatsRow } from '../services/data/types'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  FileText,
  Flame,
  LayoutDashboard,
  Lightbulb,
  Menu,
  PenSquare,
  Play,
  Settings2,
  Sparkles,
  Target,
  X,
} from 'lucide-react'

type Screen = 'landing' | 'signin' | 'signup' | 'forgot' | 'reset' | 'onboarding' | 'app'
type NavKey = 'dashboard' | 'generate' | 'scripts' | 'profiles' | 'usage' | 'billing' | 'settings'
type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6 | 7

type ChannelProfile = {
  id: string
  channelName: string
  niche: string
  description: string
  audience: string
  ageRange?: string
  tone: string
  uploadFrequency?: string
  length: string
  videoFormat?: string
  topicFocus?: string
  targetAudience?: string
  channelStage?: string
  audiencePainPoints?: string
  userNotes?: string
  ctaStyle: string
  frequency: string
  inspirations: string
  brandVoice: string
  isDefault?: boolean
}

type SavedScript = {
  id: string
  title: string
  selectedTitle: string
  date: string
  createdAt: string
  updatedAt: string
  profile: string
  niche: string
  tone: string
  type: string
  status: string
  favorite: boolean
  outlineSections: Array<{ heading: string; content: string }>
  fullScriptBody: string
  script: string
}

type ScriptDetailView = 'title' | 'outline' | 'full'

type OnboardingState = {
  channelName: string
  niche: string
  customNiche: string
  stage: string
  contentStyle: string
  uploadFrequency: string
  tone: string
  customTone: string
  audienceDescription: string
  ageRange: string
  painPoints: string
  primaryGoal: string
}

const ONBOARDING_DEFAULTS: OnboardingState = {
  channelName: '',
  niche: '',
  customNiche: '',
  stage: '',
  contentStyle: '',
  uploadFrequency: '',
  tone: '',
  customTone: '',
  audienceDescription: '',
  ageRange: '',
  painPoints: '',
  primaryGoal: '',
}

const NICHE_OPTIONS = [
  'Finance',
  'Business',
  'AI',
  'Self-improvement',
  'Motivation',
  'Luxury',
  'Tech',
  'History',
  'Health',
  'Relationships',
  'Documentaries',
  'Celebrity/News',
  'Crime',
  'Storytelling',
  'Productivity',
  'Entrepreneurship',
  'Other',
]

const STAGE_OPTIONS = [
  'Just getting started',
  'Already posting',
  'Making some income',
  'Trying to scale',
  'Agency / managing multiple channels',
]

const CONTENT_OPTIONS = [
  'Long-form faceless videos',
  'Shorts',
  'Listicles',
  'Documentaries',
  'Commentary',
  'Educational explainers',
  'Storytelling',
  'Mixed format',
]

const FREQUENCY_OPTIONS = [
  '1 video per month',
  '2 videos per month',
  '3 videos per month',
]

const TONE_OPTIONS = [
  'Dramatic',
  'Authoritative',
  'Educational',
  'Cinematic',
  'Viral / punchy',
  'Luxury',
  'Motivating',
  'Documentary',
  'Conversational',
  'Custom',
]

const PRIMARY_GOALS = [
  'Generate video ideas',
  'Write full scripts',
  'Create titles',
  'Build a full content system',
  'Save time for my team',
  'Launch my first channel',
]

const INITIAL_SCRIPTS: SavedScript[] = []

const ONBOARDING_TOTAL_STEPS = 10

const WORKFLOW_STEPS: Array<{ id: WorkflowStep; label: string }> = [
  { id: 1, label: 'Channel Context' },
  { id: 2, label: 'Video Ideas' },
  { id: 3, label: 'Titles' },
  { id: 4, label: 'Outline' },
  { id: 5, label: 'Full Script' },
  { id: 6, label: 'Polish' },
  { id: 7, label: 'Download' },
]

const NAV_ITEMS: { key: NavKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'generate', label: 'Generate', icon: Sparkles },
  { key: 'scripts', label: 'Scripts', icon: FileText },
  { key: 'profiles', label: 'Channel Profile', icon: BookOpen },
  { key: 'usage', label: 'Analytics', icon: BarChart3 },
  { key: 'billing', label: 'Billing', icon: CreditCard },
  { key: 'settings', label: 'Settings', icon: Settings2 },
]

const TESTIMONIALS = [
  {
    quote: 'Scriptr turned our content process from chaos to a reliable weekly system.',
    author: 'Creator Studio Operator',
  },
  {
    quote: 'The hook and outline workflow alone improved retention in our first 3 uploads.',
    author: 'Faceless Finance Channel Owner',
  },
  {
    quote: 'It feels like using a product built for YouTube operators, not a generic chatbot.',
    author: 'Automation Agency Lead',
  },
]

const FAQ = [
  {
    q: 'Is Scriptr only for faceless channels?',
    a: 'Scriptr is optimized for faceless channels, but the workflow also supports educational and commentary formats.',
  },
  {
    q: 'Can multiple channel profiles be used?',
    a: 'Yes. Teams can create multiple profiles, choose defaults, and generate scripts with profile-specific settings.',
  },
  {
    q: 'Does Scriptr generate full scripts?',
    a: 'Yes. From niche and topic inputs, Scriptr generates titles, outlines, full scripts, and repurpose outputs.',
  },
]

const getPrimaryNiche = (onboarding: OnboardingState) => onboarding.customNiche || onboarding.niche || 'General'
const getPrimaryTone = (onboarding: OnboardingState) => onboarding.customTone || onboarding.tone || 'Conversational'
const toCsv = (values: string[] | undefined) =>
  values && values.length
    ? values
        .map((item) => item.trim())
        .filter(Boolean)
        .join(', ')
    : null
const fromCsv = (value: string | null | undefined) =>
  value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : []

const parseIsoDate = (value: string | undefined) => {
  if (!value) {
    return null
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const outlineSectionsToEditableText = (sections: Array<{ heading: string; content: string }>) => {
  if (!sections.length) {
    return ''
  }

  return sections.map((section) => `${section.heading}\n${section.content}`.trim()).join('\n\n')
}

const editableTextToOutlineSections = (text: string) => {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) {
    return []
  }

  return normalized
    .split(/\n{2,}/)
    .map((block, index) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      if (!lines.length) {
        return null
      }

      const [heading, ...contentLines] = lines
      return {
        heading: heading || `Section ${index + 1}`,
        content: contentLines.join('\n').trim(),
      }
    })
    .filter((section): section is { heading: string; content: string } => Boolean(section))
}

const toOnboardingState = (row: OnboardingResponseRow | null): OnboardingState => {
  if (!row) {
    return ONBOARDING_DEFAULTS
  }

  return {
    channelName: row.channel_name || '',
    niche: row.niche || '',
    customNiche: row.custom_niche || '',
    stage: row.channel_stage || '',
    contentStyle: row.content_style || '',
    uploadFrequency: row.upload_frequency || '',
    tone: row.tone || '',
    customTone: row.custom_tone || '',
    audienceDescription: row.audience || '',
    ageRange: row.age_range || '',
    painPoints: row.pain_points || '',
    primaryGoal: row.primary_goal || '',
  }
}

const normalizeSavedScript = (entry: Partial<SavedScript> & { id: string }): SavedScript => {
  const createdAt = entry.createdAt || new Date().toISOString()
  const createdDate = parseIsoDate(createdAt) || new Date()
  const title = entry.title || 'Untitled Script'
  const outlineSections = Array.isArray(entry.outlineSections) ? entry.outlineSections : []
  const fullScriptBody = entry.fullScriptBody || entry.script || 'No script content yet.'

  return {
    id: entry.id,
    title,
    selectedTitle: entry.selectedTitle || title,
    date:
      entry.date || createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    createdAt,
    updatedAt: entry.updatedAt || createdAt,
    profile: entry.profile || 'Unknown Profile',
    niche: entry.niche || 'General',
    tone: entry.tone || 'Conversational',
    type: entry.type || 'Long-form faceless videos',
    status: entry.status || 'Draft',
    favorite: Boolean(entry.favorite),
    outlineSections,
    fullScriptBody,
    script: entry.script || fullScriptBody,
  }
}

const toSavedScript = (
  row: ScriptRow,
  profileNamesById?: Record<string, string>,
  fallbackChannelName?: string,
): SavedScript => {
  const createdDate = parseIsoDate(row.created_at) || new Date()
  const parsedOutline = (() => {
    if (!row.outline) {
      return []
    }
    try {
      const parsed = JSON.parse(row.outline) as Array<{ heading: string; content: string }>
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })()

  return normalizeSavedScript({
    id: row.id,
    title: row.title || 'Untitled Script',
    selectedTitle: row.selected_title || row.title || 'Untitled Script',
    date: createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    profile:
      (row.channel_profile_id ? profileNamesById?.[row.channel_profile_id] : null) ||
      fallbackChannelName ||
      'Primary Profile',
    niche: row.niche || 'General',
    tone: row.tone || 'Conversational',
    type: row.script_type || 'Long-form faceless videos',
    status: row.status || 'Draft',
    favorite: Boolean(row.favorite),
    outlineSections: parsedOutline,
    fullScriptBody: row.full_script || 'No script content yet.',
    script: row.full_script || 'No script content yet.',
  })
}

const toChannelProfile = (row: ChannelProfileRow): ChannelProfile => ({
  id: row.id,
  channelName: row.channel_name || 'Untitled Channel',
  niche: row.niche || 'General',
  description: `Channel strategy for ${row.channel_name || 'your channel'} focused on ${row.niche || 'General'} content.`,
  audience: row.audience || 'Audience profile not set yet.',
  tone: row.tone || 'Conversational',
  ageRange: row.age_range || undefined,
  uploadFrequency: row.upload_frequency || undefined,
  length: row.video_length || '8-12 minutes',
  videoFormat: row.video_format || undefined,
  topicFocus: row.topic_focus || undefined,
  targetAudience: row.target_audience || row.audience || undefined,
  channelStage: row.channel_stage || undefined,
  audiencePainPoints: row.audience_pain_points || undefined,
  userNotes: row.user_notes || undefined,
  ctaStyle: 'Subscriber CTA',
  frequency: row.upload_frequency || '1 video per month',
  inspirations: row.example_channels || 'Add inspiration channels',
  brandVoice: row.tone || 'Conversational',
  isDefault: Boolean(row.is_default),
})

const buildPrimaryProfile = (onboarding: OnboardingState): ChannelProfile => ({
  id: 'cp-primary',
  channelName: onboarding.channelName || 'Untitled Channel',
  niche: getPrimaryNiche(onboarding),
  description: `Channel strategy for ${onboarding.channelName || 'your channel'} focused on ${
    getPrimaryNiche(onboarding)
  } content.`,
  audience: onboarding.audienceDescription || 'Audience profile not set yet.',
  ageRange: onboarding.ageRange || undefined,
  tone: getPrimaryTone(onboarding),
  uploadFrequency: onboarding.uploadFrequency || undefined,
  length: '8-12 minutes',
  videoFormat: onboarding.contentStyle || 'Long-form faceless videos',
  targetAudience: onboarding.audienceDescription || undefined,
  channelStage: onboarding.stage || undefined,
  audiencePainPoints: onboarding.painPoints || undefined,
  userNotes: onboarding.primaryGoal || undefined,
  ctaStyle: onboarding.primaryGoal || 'Subscriber CTA',
  frequency: onboarding.uploadFrequency || '1 video per month',
  inspirations: 'Add inspiration channels',
  brandVoice: getPrimaryTone(onboarding),
  isDefault: true,
})

const toOnboardingUpsertPayload = (userId: string, onboarding: OnboardingState, completedAt?: string | null) => {
  const payload = {
    user_id: userId,
    niche: onboarding.niche || null,
    channel_stage: onboarding.stage || null,
    content_style: onboarding.contentStyle || null,
    audience: onboarding.audienceDescription || null,
    channel_name: onboarding.channelName || null,
    upload_frequency: onboarding.uploadFrequency || null,
    tone: onboarding.tone || null,
    age_range: onboarding.ageRange || null,
    pain_points: onboarding.painPoints || null,
    primary_goal: onboarding.primaryGoal || null,
    custom_niche: onboarding.customNiche || null,
    custom_tone: onboarding.customTone || null,
  }

  if (completedAt !== undefined) {
    return { ...payload, completed_at: completedAt }
  }

  return payload
}

function ScriptrLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup">
      <div className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 56 56" role="img">
          <defs>
            <linearGradient id="scriptrMark" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#FF3347" />
              <stop offset="100%" stopColor="#E11D2E" />
            </linearGradient>
          </defs>
          <rect x="3" y="3" width="50" height="50" rx="14" fill="#0B0B0B" stroke="#2A2A2A" />
          <path
            d="M38 18c-2.2-2.7-5.6-4-10.1-4-6.5 0-11 3.1-11 8 0 4.1 2.7 6.3 8.7 7.4l4.2.7c2.6.5 3.7 1.4 3.7 2.9 0 2.1-2.3 3.4-5.9 3.4-3.5 0-6.1-1.2-8.1-3.4"
            fill="none"
            stroke="url(#scriptrMark)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="M35 16l7 0" stroke="#FF3347" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
      {!compact && (
        <div className="wordmark-wrap">
          <span className="wordmark">Scriptr</span>
          <span className="brand-parent">Automation Muse</span>
        </div>
      )}
    </div>
  )
}

const looksLikeHeading = (line: string) => {
  const trimmed = line.trim()
  if (!trimmed) {
    return false
  }
  if (/^([A-Z][A-Z0-9\s'&/-]{2,}|[A-Z][A-Z0-9\s'&/-]{2,}:)$/.test(trimmed)) {
    return true
  }
  return /^(hook|curiosity gap|setup|escalation|new information|mid reset|reveal|payoff|cta|intro|introduction|body|main points?|part \d+|section \d+|conclusion|outro)\b[:\s-]*/i.test(trimmed)
}

type ScriptPdfBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }

const parseScriptBlocksForPdf = (text: string): ScriptPdfBlock[] => {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) {
    return [{ kind: 'paragraph', text: 'No script content yet.' }]
  }

  const lines = normalized.split('\n').map((line) => line.trim())
  const parsed: ScriptPdfBlock[] = []
  let paragraphBuffer: string[] = []

  const flushParagraph = () => {
    if (!paragraphBuffer.length) {
      return
    }
    parsed.push({ kind: 'paragraph', text: paragraphBuffer.join(' ').trim() })
    paragraphBuffer = []
  }

  lines.forEach((line) => {
    if (!line) {
      flushParagraph()
      return
    }

    if (looksLikeHeading(line)) {
      flushParagraph()
      parsed.push({ kind: 'heading', text: line.replace(/:\s*$/, '') })
      return
    }

    paragraphBuffer.push(line)
  })

  flushParagraph()

  return parsed.length ? parsed : [{ kind: 'paragraph', text: normalized }]
}

const getPdfSafeFilename = (title: string) => {
  const normalized = (title.trim() || 'untitled-script').toLowerCase()
  const cleaned = normalized
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return cleaned || 'untitled-script'
}

const downloadScriptPdf = async (scriptTitle: string, scriptContent: string) => {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 54
  const topMargin = 56
  const bottomMargin = 56
  const contentWidth = pageWidth - marginX * 2
  const blocks = parseScriptBlocksForPdf(scriptContent || 'No script content yet.')
  const exportDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const title = scriptTitle.trim() || 'Untitled Script'
  const filename = getPdfSafeFilename(title)
  const headerY = topMargin
  const contentStartY = 128
  let y = contentStartY

  const drawBrandMark = (x: number, yPos: number) => {
    doc.setFillColor(11, 11, 11)
    doc.roundedRect(x, yPos, 26, 26, 7, 7, 'F')
    doc.setTextColor(255, 51, 71)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.text('S', x + 8.5, yPos + 18.25)
  }

  const drawPageChrome = (pageNumber: number) => {
    doc.setFillColor(245, 239, 229)
    doc.rect(0, 0, pageWidth, pageHeight, 'F')
    doc.setFillColor(255, 253, 250)
    doc.roundedRect(marginX - 12, topMargin - 20, contentWidth + 24, pageHeight - topMargin - bottomMargin + 20, 14, 14, 'F')

    drawBrandMark(marginX, headerY - 4)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(20, 20, 20)
    doc.text('Scriptr', marginX + 34, headerY + 14)
    doc.setFontSize(10)
    doc.setTextColor(123, 103, 82)
    doc.text('AUTOMATION MUSE', marginX + 34, headerY + 28)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(108, 89, 70)
    doc.text(`Exported ${exportDate}`, pageWidth - marginX, headerY + 4, { align: 'right' })
    doc.text(`Page ${pageNumber}`, pageWidth - marginX, headerY + 18, { align: 'right' })

    doc.setDrawColor(231, 219, 203)
    doc.line(marginX, contentStartY - 12, pageWidth - marginX, contentStartY - 12)
  }

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - bottomMargin) {
      return
    }
    doc.addPage()
    const pageNumber = doc.getNumberOfPages()
    drawPageChrome(pageNumber)
    y = contentStartY
  }

  const writeBodyParagraph = (paragraphText: string) => {
    doc.setFont('times', 'normal')
    doc.setFontSize(12)
    doc.setTextColor(34, 26, 20)
    const lines = doc.splitTextToSize(paragraphText, contentWidth)
    const lineHeight = 18
    ensureSpace(lines.length * lineHeight + 8)
    doc.text(lines, marginX, y)
    y += lines.length * lineHeight + 8
  }

  drawPageChrome(1)

  doc.setFont('times', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(28, 26, 23)
  const titleLines = doc.splitTextToSize(title, contentWidth)
  ensureSpace(titleLines.length * 30 + 12)
  doc.text(titleLines, marginX, y)
  y += titleLines.length * 30 + 8

  blocks.forEach((block) => {
    if (block.kind === 'heading') {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(112, 40, 31)
      const headingLines = doc.splitTextToSize(block.text, contentWidth)
      ensureSpace(headingLines.length * 18 + 8)
      doc.text(headingLines, marginX, y)
      y += headingLines.length * 18 + 6
      return
    }
    writeBodyParagraph(block.text)
  })

  doc.save(`${filename}.pdf`)
}

function Home() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [activeNav, setActiveNav] = useState<NavKey>('dashboard')
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>(1)
  const [onboardingStep, setOnboardingStep] = useState(1)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [toast, setToast] = useState('')

  const [authUser, setAuthUser] = useState<{ name: string; email: string } | null>(null)
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [sessionLoading, setSessionLoading] = useState(true)
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false)

  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('')
  const [forgotStatus, setForgotStatus] = useState('')
  const [resetStatus, setResetStatus] = useState('')

  const [onboarding, setOnboarding] = useState<OnboardingState>(ONBOARDING_DEFAULTS)
  const [profiles, setProfiles] = useState<ChannelProfile[]>([])
  const [scripts, setScripts] = useState<SavedScript[]>(INITIAL_SCRIPTS)
  const [selectedScriptId, setSelectedScriptId] = useState('')
  const [scriptDetailView, setScriptDetailView] = useState<ScriptDetailView>('title')
  const [titleDraft, setTitleDraft] = useState('')
  const [outlineDraft, setOutlineDraft] = useState('')
  const [fullScriptDraft, setFullScriptDraft] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingOutline, setIsEditingOutline] = useState(false)
  const [isEditingScript, setIsEditingScript] = useState(false)
  const [isSavingScriptDetail, setIsSavingScriptDetail] = useState(false)
  const [isDeleteScriptDialogOpen, setIsDeleteScriptDialogOpen] = useState(false)
  const [isDeletingSelectedScript, setIsDeletingSelectedScript] = useState(false)
  const [usageStats, setUsageStats] = useState<UsageStatsRow | null>(null)

  const [channelContext, setChannelContext] = useState<ChannelContext>({
    channelProfile: '',
    audience: '',
    exampleChannels: [],
    userNotes: '',
    channelStyle: '',
    audiencePainPoints: '',
    niche: '',
    videoTopicIdea: '',
    targetAudience: '',
    tone: '',
    videoLength: '10-12 minutes',
    videoFormat: 'Long-form faceless videos',
    channelName: '',
  })

  const [videoIdeas, setVideoIdeas] = useState<VideoIdea[]>([])
  const [selectedIdeaIndex, setSelectedIdeaIndex] = useState<number | null>(null)
  const [titleOptions, setTitleOptions] = useState<TitlePayload | null>(null)
  const [selectedTitle, setSelectedTitle] = useState('')
  const [outlineBlocks, setOutlineBlocks] = useState<OutlineSection[]>([])
  const [scriptDraft, setScriptDraft] = useState<GeneratedScript | null>(null)
  const [polishMode, setPolishMode] = useState<'shorten' | 'expand' | 'retention' | 'simplify' | 'intensify'>('retention')
  const [polishedScriptText, setPolishedScriptText] = useState('')
  const [polishChat, setPolishChat] = useState<Array<{ id: string; role: 'user' | 'assistant'; message: string }>>([])
  const [autosavedScriptId, setAutosavedScriptId] = useState<string | null>(null)

  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [loadingSubMessages, setLoadingSubMessages] = useState<string[]>([])
  const [loadingSubMessageIndex, setLoadingSubMessageIndex] = useState(0)
  const [generationError, setGenerationError] = useState('')
  const [retryAction, setRetryAction] = useState<null | (() => void)>(null)
  const [journeyFocused, setJourneyFocused] = useState(false)
  const onboardingSyncErrorShownRef = useRef(false)

  useEffect(() => {
    if (!isGenerating || loadingSubMessages.length < 2) {
      return
    }

    const interval = window.setInterval(() => {
      setLoadingSubMessageIndex((current) => (current + 1) % loadingSubMessages.length)
    }, 1600)

    return () => window.clearInterval(interval)
  }, [isGenerating, loadingSubMessages])

  const primaryProfile = useMemo(
    () => profiles.find((profile) => profile.isDefault) || profiles[0] || buildPrimaryProfile(onboarding),
    [onboarding, profiles],
  )

  const buildDefaultProfileInput = (userId: string, onboardingState: OnboardingState) => ({
    user_id: userId,
    channel_name: onboardingState.channelName || null,
    niche: getPrimaryNiche(onboardingState),
    audience: onboardingState.audienceDescription || null,
    tone: getPrimaryTone(onboardingState),
  })

  const saveOnboardingSnapshot = async (userId: string, onboardingState: OnboardingState, completedAt?: string | null) => {
    const onboardingRow = await onboardingService.upsert(toOnboardingUpsertPayload(userId, onboardingState, completedAt))
    return { onboardingRow }
  }

  const clearWorkspaceState = () => {
    setAuthUser(null)
    setAuthUserId(null)
    setOnboarding(ONBOARDING_DEFAULTS)
    setProfiles([])
    setScripts(INITIAL_SCRIPTS)
    setSelectedScriptId('')
    setUsageStats(null)
    setIsCompletingOnboarding(false)
    setAutosavedScriptId(null)
    onboardingSyncErrorShownRef.current = false
  }

  const hydrateAccountData = async (userId: string, email: string, nameFallback?: string) => {
    const [profile, onboardingRow, channelRows, scriptRows, usageRow] = await Promise.all([
      profileService.ensureProfileByIdentity(userId, email, nameFallback ?? null),
      onboardingService.getByUserId(userId),
      channelProfileService.listByUserId(userId),
      scriptService.listByUserId(userId),
      usageStatsService.ensure(userId),
    ])

    const effectiveName = profile?.full_name || nameFallback || email.split('@')[0] || 'Creator'
    const normalizedOnboarding = toOnboardingState(onboardingRow)
    const mappedProfiles = channelRows.map(toChannelProfile)
    const effectiveProfiles = mappedProfiles.length ? mappedProfiles : [buildPrimaryProfile(normalizedOnboarding)]
    const defaultProfileName = effectiveProfiles.find((profileItem) => profileItem.isDefault)?.channelName || effectiveProfiles[0]?.channelName
    const profileNamesById = Object.fromEntries(effectiveProfiles.map((profile) => [profile.id, profile.channelName]))
    const mappedScripts = scriptRows.map((script) => toSavedScript(script, profileNamesById, defaultProfileName))

    setAuthUser({ name: effectiveName, email })
    setAuthUserId(userId)
    setOnboarding(normalizedOnboarding)
    setProfiles(effectiveProfiles)
    setScripts(mappedScripts)
    setSelectedScriptId('')
    setUsageStats(usageRow)
    setScreen(onboardingRow?.completed_at ? 'app' : 'onboarding')
    setOnboardingStep(onboardingRow?.completed_at ? ONBOARDING_TOTAL_STEPS : 1)
  }

  const openToast = (message: string) => {
    setToast(message)
  }

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) {
      return error.message
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      const maybeMessage = (error as { message?: unknown }).message
      if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
        return maybeMessage
      }
    }

    if (typeof error === 'string' && error.trim()) {
      return error
    }

    return fallback
  }

  const setFallbackAuthenticatedState = (userId: string, email: string, nameFallback?: string) => {
    const safeEmail = email || 'you@example.com'
    const effectiveName = nameFallback || safeEmail.split('@')[0] || 'Creator'
    const fallbackOnboarding = ONBOARDING_DEFAULTS

    setAuthUser({ name: effectiveName, email: safeEmail })
    setAuthUserId(userId)
    setOnboarding(fallbackOnboarding)
    setProfiles([buildPrimaryProfile(fallbackOnboarding)])
    setScripts(INITIAL_SCRIPTS)
    setSelectedScriptId('')
    setUsageStats(null)
    setScreen('onboarding')
    setOnboardingStep(1)
  }

  const hydrateAccountDataSafely = async (
    userId: string,
    email: string,
    nameFallback?: string,
    options: { notify?: boolean; setInlineError?: boolean } = {},
  ) => {
    try {
      await hydrateAccountData(userId, email, nameFallback)
      return true
    } catch (error) {
      setFallbackAuthenticatedState(userId, email, nameFallback)
      const message = getErrorMessage(error, 'Signed in, but account setup could not be completed.')
      if (options.notify) {
        openToast('Signed in, but account setup is still in progress. You can continue.')
      }
      if (options.setInlineError) {
        setAuthError(message)
      }
      console.error('Failed to hydrate account data after auth.', error)
      return false
    }
  }

  useEffect(() => {
    let isActive = true

    const restoreSession = async () => {
      setSessionLoading(true)
      setAuthError('')
      try {
        const session = await authService.getSession()
        if (!isActive) {
          return
        }

        const mode = new URLSearchParams(window.location.search).get('type')
        if (mode === 'recovery' && session?.user) {
          setAuthUserId(session.user.id)
          setAuthUser({
            name: (session.user.user_metadata?.full_name as string | undefined) || session.user.email?.split('@')[0] || 'Creator',
            email: session.user.email || '',
          })
          setScreen('reset')
          return
        }

        if (session?.user && session.user.email) {
          await hydrateAccountDataSafely(
            session.user.id,
            session.user.email,
            (session.user.user_metadata?.full_name as string | undefined) || undefined,
            { notify: true, setInlineError: true },
          )
        } else {
          clearWorkspaceState()
          setScreen('landing')
        }
      } catch {
        if (!isActive) {
          return
        }
        clearWorkspaceState()
        setScreen('signin')
        setAuthError('Failed to restore session. Please sign in again.')
      } finally {
        if (isActive) {
          setSessionLoading(false)
        }
      }
    }

    void restoreSession()

    const {
      data: { subscription },
    } = authService.onAuthStateChange((event, session) => {
      if (!isActive) {
        return
      }

      if (event === 'PASSWORD_RECOVERY') {
        setScreen('reset')
        setResetStatus('')
        setAuthError('')
        return
      }

      if (session?.user && session.user.email) {
        void hydrateAccountDataSafely(
          session.user.id,
          session.user.email,
          (session.user.user_metadata?.full_name as string | undefined) || undefined,
          { notify: true },
        )
      } else if (event === 'SIGNED_OUT') {
        clearWorkspaceState()
        setScreen('signin')
      }
    })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timeout = setTimeout(() => setToast(''), 2400)
    return () => clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (activeNav === 'scripts') {
      setSelectedScriptId('')
      setScriptDetailView('title')
    }
  }, [activeNav])

  useEffect(() => {
    setChannelContext((value) => ({
      ...value,
      channelProfile: value.channelProfile || primaryProfile.description,
      niche: primaryProfile.niche,
      audience: value.audience || primaryProfile.audience,
      targetAudience: value.targetAudience || primaryProfile.targetAudience || primaryProfile.audience,
      tone: value.tone || primaryProfile.tone,
      exampleChannels:
        value.exampleChannels && value.exampleChannels.length
          ? value.exampleChannels
          : fromCsv(primaryProfile.inspirations),
      userNotes: value.userNotes || primaryProfile.userNotes || onboarding.primaryGoal || '',
      audiencePainPoints: value.audiencePainPoints || primaryProfile.audiencePainPoints || onboarding.painPoints || '',
      channelStyle: value.channelStyle || value.videoFormat || primaryProfile.videoFormat || onboarding.contentStyle,
      channelName: value.channelName || primaryProfile.channelName,
      videoLength: value.videoLength || primaryProfile.length || '8-12 minutes',
      videoFormat: value.videoFormat || primaryProfile.videoFormat || onboarding.contentStyle || 'Long-form faceless videos',
      videoTopicIdea: value.videoTopicIdea || primaryProfile.topicFocus || '',
    }))
  }, [primaryProfile, onboarding.contentStyle, onboarding.painPoints, onboarding.primaryGoal])

  useEffect(() => {
    if (!authUserId || screen !== 'onboarding' || isCompletingOnboarding) {
      return
    }

    const timeout = setTimeout(() => {
      void saveOnboardingSnapshot(authUserId, onboarding).then(() => {
        onboardingSyncErrorShownRef.current = false
      }).catch(() => {
        if (!onboardingSyncErrorShownRef.current) {
          openToast('Unable to save onboarding data right now.')
          onboardingSyncErrorShownRef.current = true
        }
      })
    }, 350)

    return () => clearTimeout(timeout)
  }, [authUserId, isCompletingOnboarding, onboarding, screen])

  useEffect(() => {
    if (sessionLoading) {
      return
    }
    if (!authUserId && (screen === 'app' || screen === 'onboarding' || screen === 'reset')) {
      setScreen('signin')
    }
  }, [authUserId, screen, sessionLoading])

  const selectedProfile = primaryProfile

  const selectedScript = useMemo(
    () => scripts.find((item) => item.id === selectedScriptId) || null,
    [scripts, selectedScriptId],
  )

  useEffect(() => {
    if (!selectedScript) {
      setTitleDraft('')
      setOutlineDraft('')
      setFullScriptDraft('')
      setIsEditingTitle(false)
      setIsEditingOutline(false)
      setIsEditingScript(false)
      setIsDeleteScriptDialogOpen(false)
      setIsDeletingSelectedScript(false)
      return
    }

    setTitleDraft(selectedScript.selectedTitle || selectedScript.title)
    setOutlineDraft(outlineSectionsToEditableText(selectedScript.outlineSections))
    setFullScriptDraft(selectedScript.fullScriptBody || selectedScript.script)
    setIsEditingTitle(false)
    setIsEditingOutline(false)
    setIsEditingScript(false)
  }, [selectedScriptId, selectedScript])
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  const currentMonthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const scriptsThisMonthCount = useMemo(
    () =>
      scripts.filter((script) => {
        const created = parseIsoDate(script.createdAt) || new Date(script.date)
        if (Number.isNaN(created.getTime())) {
          return false
        }
        return created.getMonth() === currentMonth && created.getFullYear() === currentYear
      }).length,
    [currentMonth, currentYear, scripts],
  )

  const favoriteNiche = useMemo(() => {
    if (!scripts.length) {
      return 'N/A'
    }

    const nicheCounts = scripts.reduce<Record<string, number>>((acc, script) => {
      const niche = script.niche?.trim() || 'General'
      acc[niche] = (acc[niche] || 0) + 1
      return acc
    }, {})

    return Object.entries(nicheCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
  }, [scripts])

  const mostUsedTone = useMemo(() => {
    if (!scripts.length) {
      return 'N/A'
    }

    const toneCounts = scripts.reduce<Record<string, number>>((acc, script) => {
      const tone = script.tone?.trim() || 'Conversational'
      acc[tone] = (acc[tone] || 0) + 1
      return acc
    }, {})

    return Object.entries(toneCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
  }, [scripts])

  const onAuthSubmit = async (mode: 'signin' | 'signup') => {
    if (!authForm.email || !authForm.password || (mode === 'signup' && !authForm.name)) {
      setAuthError('Complete all required fields before continuing.')
      return
    }

    setAuthLoading(true)
    setAuthError('')

    try {
      if (mode === 'signup') {
        const signupResult = await authService.signUp(authForm.email, authForm.password, authForm.name)

        if (signupResult.session?.user && signupResult.user?.email) {
          await hydrateAccountDataSafely(signupResult.session.user.id, signupResult.user.email, authForm.name, {
            notify: true,
            setInlineError: true,
          })
          setScreen('onboarding')
          openToast('Account created. Personalizing your workspace.')
        } else {
          setScreen('signin')
          openToast('Account created. Check your email to confirm your account before signing in.')
        }
      } else {
        const signinResult = await authService.signIn(authForm.email, authForm.password)
        if (!signinResult.user?.email) {
          throw new Error('No account session was returned.')
        }

        await hydrateAccountDataSafely(
          signinResult.user.id,
          signinResult.user.email,
          (signinResult.user.user_metadata?.full_name as string | undefined) || undefined,
          { notify: true, setInlineError: true },
        )
        openToast('Signed in. Welcome back to Scriptr.')
      }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to complete authentication right now.')
      setAuthError(message)
    } finally {
      setAuthLoading(false)
    }
  }

  const onLogout = async () => {
    try {
      await authService.signOut()
    } catch {
      setAuthError('Sign out failed. Try again.')
      return
    }

    clearWorkspaceState()
    setScreen('signin')
    setActiveNav('dashboard')
    openToast('Signed out.')
  }

  const persistOnboarding = (updated: OnboardingState) => {
    setOnboarding(updated)
  }

  const nextOnboarding = async () => {
    if (onboardingStep === 3 && !onboarding.channelName.trim()) {
      openToast('Please enter your channel name to continue.')
      return
    }

    if (onboardingStep === ONBOARDING_TOTAL_STEPS) {
      if (isCompletingOnboarding) {
        return
      }

      if (!authUserId) {
        openToast('Session expired. Please sign in again.')
        setScreen('signin')
        return
      }

      setIsCompletingOnboarding(true)
      try {
        const session = await authService.getSession()
        if (!session?.user?.id) {
          openToast('Session expired. Please sign in again.')
          setScreen('signin')
          return
        }

        const sessionUserId = session.user.id
        if (sessionUserId !== authUserId) {
          setAuthUserId(sessionUserId)
        }

        const completedAt = new Date().toISOString()
        const { onboardingRow } = await saveOnboardingSnapshot(sessionUserId, onboarding, completedAt)
        const defaultProfile = await channelProfileService.upsertDefault(buildDefaultProfileInput(sessionUserId, onboarding))
        setProfiles((current) => {
          const mapped = toChannelProfile(defaultProfile)
          const rest = current.filter((profile) => profile.id !== mapped.id)
          return [mapped, ...rest]
        })
        const normalizedOnboarding = toOnboardingState(onboardingRow)
        if (!onboardingRow.completed_at) {
          throw new Error('Onboarding completion was not persisted.')
        }

        setOnboarding(normalizedOnboarding)
        setActiveNav('dashboard')
        setOnboardingStep(ONBOARDING_TOTAL_STEPS)
        setScreen('app')
        openToast('Workspace ready. Start building your channel system.')
      } catch {
        openToast('Unable to complete onboarding right now.')
      } finally {
        setIsCompletingOnboarding(false)
      }
      return
    }

    setOnboardingStep((value) => Math.min(ONBOARDING_TOTAL_STEPS, value + 1))
  }

  const previousOnboarding = () => {
    setOnboardingStep((value) => Math.max(1, value - 1))
  }

  const toggleFavoriteScript = (id: string) => {
    if (!authUserId) {
      return
    }

    setScripts((current) => {
      const next = current.map((script) => (script.id === id ? { ...script, favorite: !script.favorite } : script))
      const updated = next.find((script) => script.id === id)
      if (updated) {
        void scriptService.updateScript(id, authUserId, { favorite: updated.favorite }).catch(() => {
          openToast('Failed to update favorite.')
        })
      }
      return next
    })
  }

  const selectedIdea = selectedIdeaIndex !== null ? videoIdeas[selectedIdeaIndex] : null

  const formatScriptText = (generated?: GeneratedScript) => {
    if (!generated) {
      return 'No script content yet.'
    }

    const sections = Array.isArray(generated.script.sections) ? generated.script.sections : []
    return [`Title: ${generated.script.title}`, '', ...sections.map((section) => `${section.section}\n${section.text}`)].join('\n\n')
  }

  const getCurrentScriptText = () => polishedScriptText || formatScriptText(scriptDraft || undefined)

  const refreshScriptsFromSupabase = async (userId: string, preferredScriptId?: string) => {
    const scriptRows = await scriptService.listByUserId(userId)
    const profileNamesById = Object.fromEntries(profiles.map((profile) => [profile.id, profile.channelName]))
    const mappedScripts = scriptRows.map((script) => toSavedScript(script, profileNamesById, selectedProfile.channelName))
    setScripts(mappedScripts)

    const nextSelectedScriptId =
      preferredScriptId && mappedScripts.some((script) => script.id === preferredScriptId)
        ? preferredScriptId
        : mappedScripts[0]?.id || ''

    setSelectedScriptId(nextSelectedScriptId)
    return mappedScripts
  }

  const upsertSavedScript = async (
    generated: GeneratedScript,
    options: { notify: boolean; fullScriptBody?: string; outlineSections?: Array<{ heading: string; content: string }> },
  ) => {
    if (!authUserId) {
      openToast('Sign in is required to save scripts.')
      return
    }

    const formattedBody = options.fullScriptBody || formatScriptText(generated)
    const finalOutlineSections =
      options.outlineSections ||
      outlineBlocks.map((section) => ({
        heading: section.section,
        content: section.content,
      }))
    const wordCount = formattedBody.length
    const generatedTitle = generated.script.title || `Untitled Script (${new Date().toLocaleDateString()})`
    const generatedIdea = selectedIdea?.title || selectedIdea?.concept || null
    const generatedOutline = JSON.stringify(finalOutlineSections)
    const channelProfileId = /^[0-9a-f-]{36}$/i.test(selectedProfile.id) ? selectedProfile.id : null
    const scriptPayload = {
      user_id: authUserId,
      channel_profile_id: channelProfileId,
      title: generatedTitle,
      selected_title: selectedTitle || generatedTitle,
      idea: generatedIdea,
      outline: generatedOutline,
      full_script: formattedBody,
      status: 'completed',
      word_count: wordCount,
      niche: channelContext.niche,
      tone: channelContext.tone || primaryProfile.tone,
      example_channels: toCsv(channelContext.exampleChannels),
      topic_focus: channelContext.videoTopicIdea || null,
      user_notes: channelContext.userNotes || null,
      video_length: channelContext.videoLength || null,
      generated_ideas: videoIdeas.length ? JSON.stringify(videoIdeas) : null,
      script_type: 'youtube' as const,
    }

    try {
      if (autosavedScriptId) {
        try {
          await scriptService.updateScript(autosavedScriptId, authUserId, scriptPayload)
          const mappedScripts = await refreshScriptsFromSupabase(authUserId, autosavedScriptId)
          if (!mappedScripts.some((script) => script.id === autosavedScriptId)) {
            throw new Error('Updated script could not be found in scripts library after refresh.')
          }
          const freshUsage = await usageStatsService.markActive(authUserId)
          setUsageStats(freshUsage)
        } catch (updateError) {
          console.warn('Update save path failed, inserting a new script row instead.', updateError)
          const insertedScript = await scriptService.insertScript({
            ...scriptPayload,
            favorite: false,
          })
          setAutosavedScriptId(insertedScript.id)
          const mappedScripts = await refreshScriptsFromSupabase(authUserId, insertedScript.id)
          if (!mappedScripts.some((script) => script.id === insertedScript.id)) {
            throw new Error('Inserted script could not be found in scripts library after refresh.')
          }
          const freshUsage = await usageStatsService.incrementScriptsGenerated(authUserId)
          setUsageStats(freshUsage)
        }
      } else {
        const insertedScript = await scriptService.insertScript({
          ...scriptPayload,
          favorite: false,
        })

        setAutosavedScriptId(insertedScript.id)
        const mappedScripts = await refreshScriptsFromSupabase(authUserId, insertedScript.id)
        if (!mappedScripts.some((script) => script.id === insertedScript.id)) {
          throw new Error('Inserted script could not be found in scripts library after refresh.')
        }
        const freshUsage = await usageStatsService.incrementScriptsGenerated(authUserId)
        setUsageStats(freshUsage)
      }
    } catch (error) {
      console.error('Failed to save script to Supabase.', error)
      openToast('Unable to save script to cloud storage.')
      return
    }

    if (options.notify) {
      openToast('Script saved to scripts library.')
    }
  }

  const submitForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      setAuthError('Email is required.')
      return
    }

    setAuthLoading(true)
    setAuthError('')
    setForgotStatus('')

    try {
      await authService.sendPasswordResetEmail(forgotEmail.trim())
      setForgotStatus('Password reset email sent. Check your inbox.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send password reset email.'
      setAuthError(message)
    } finally {
      setAuthLoading(false)
    }
  }

  const submitResetPassword = async () => {
    if (!resetPassword || !resetPasswordConfirm) {
      setAuthError('Enter and confirm your new password.')
      return
    }
    if (resetPassword !== resetPasswordConfirm) {
      setAuthError('Passwords do not match.')
      return
    }
    if (resetPassword.length < 8) {
      setAuthError('Password must be at least 8 characters.')
      return
    }

    setAuthLoading(true)
    setAuthError('')
    setResetStatus('')

    try {
      await authService.updatePassword(resetPassword)
      setResetStatus('Password updated successfully. You can now sign in.')
      setResetPassword('')
      setResetPasswordConfirm('')
      setScreen('signin')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update password.'
      setAuthError(message)
    } finally {
      setAuthLoading(false)
    }
  }

  const withGenerationState = async (
    message: string,
    retry: () => void,
    action: () => Promise<void>,
    options?: { subMessages?: string[] },
  ) => {
    setIsGenerating(true)
    setLoadingMessage(message)
    const safeSubMessages = Array.isArray(options?.subMessages) ? options.subMessages.filter(Boolean) : []
    setLoadingSubMessages(safeSubMessages)
    setLoadingSubMessageIndex(0)
    setGenerationError('')
    setRetryAction(null)
    try {
      await action()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong with AI generation.'
      setGenerationError(message)
      setRetryAction(() => retry)
      openToast('Generation failed. Retry.')
    } finally {
      setIsGenerating(false)
      setLoadingMessage('')
      setLoadingSubMessages([])
      setLoadingSubMessageIndex(0)
    }
  }

  const normalizeOutlierStatus = (value: unknown): 'Low' | 'Medium' | 'High' => {
    if (typeof value !== 'string') {
      return 'Medium'
    }
    const normalized = value.trim().toLowerCase()
    if (normalized === 'low') {
      return 'Low'
    }
    if (normalized === 'high') {
      return 'High'
    }
    return 'Medium'
  }

  const generateIdeas = async () => {
    if (!channelContext.niche.trim() || !channelContext.targetAudience.trim() || !channelContext.videoTopicIdea.trim()) {
      openToast('Add niche, target audience, and video topic idea to generate ideas.')
      return
    }

    setJourneyFocused(true)
    await withGenerationState('Conducting outlier research...', () => void generateIdeas(), async () => {
      const data = await requestIdeas(channelContext)
      setVideoIdeas(data.ideas.slice(0, 3))
      setSelectedIdeaIndex(null)
      setTitleOptions(null)
      setSelectedTitle('')
      setOutlineBlocks([])
      setScriptDraft(null)
      setPolishedScriptText('')
      setPolishChat([])
      setAutosavedScriptId(null)
      setWorkflowStep(2)
      openToast('Video ideas generated.')
    }, {
      subMessages: [
        'Scanning YouTube patterns...',
        'Analyzing outperforming videos...',
        'Finding unusual winners in this niche...',
        'Comparing strong content angles...',
      ],
    })
  }

  const generateTitlesForIdea = async (ideaIndex: number) => {
    const idea = videoIdeas[ideaIndex]
    if (!idea) {
      return
    }

    setSelectedIdeaIndex(ideaIndex)
    await withGenerationState('Generating potential titles...', () => void generateTitlesForIdea(ideaIndex), async () => {
      const data = await requestTitles(channelContext, idea)
      setTitleOptions(data)
      setSelectedTitle('')
      setOutlineBlocks([])
      setScriptDraft(null)
      setPolishedScriptText('')
      setAutosavedScriptId(null)
      setWorkflowStep(3)
      openToast('Titles generated.')
    })
  }

  const chooseTitleAndBuildOutline = async (title: string) => {
    setSelectedTitle(title)
    setAutosavedScriptId(null)
    await withGenerationState('Building your retention-focused outline...', () => void chooseTitleAndBuildOutline(title), async () => {
      const idea = selectedIdeaIndex !== null ? videoIdeas[selectedIdeaIndex] : null
      if (!idea) {
        throw new Error('Select a video idea first.')
      }

      const data = await requestOutline({
        channelContext,
        selectedIdea: idea,
        selectedTitle: title,
        audience: channelContext.targetAudience,
        tone: channelContext.tone,
        videoLength: channelContext.videoLength,
      })

      setOutlineBlocks(data.outline)
      setScriptDraft(null)
      setPolishedScriptText('')
      setWorkflowStep(4)
      openToast('Outline generated.')
    })
  }

  const generateScript = async () => {
    if (!selectedIdea || !selectedTitle || !outlineBlocks.length) {
      openToast('Complete outline first.')
      return
    }

    await withGenerationState('Writing your full script...', () => void generateScript(), async () => {
      const data = await requestScript({
        channelContext,
        selectedIdea,
        selectedTitle,
        generatedOutline: outlineBlocks,
        tone: channelContext.tone,
        videoLength: channelContext.videoLength,
      })
      setScriptDraft(data)
      setPolishedScriptText('')
      await upsertSavedScript(data, { notify: true })
      setWorkflowStep(5)
      openToast('Full script generated.')
    })
  }

  const sendPolishCommand = async () => {
    if (!scriptDraft) {
      openToast('Generate a script first.')
      return
    }

    const userMessage = `Apply mode: ${polishMode}`
    setPolishChat((current) => [...current, { id: `user-${Date.now()}`, role: 'user', message: userMessage }])

    await withGenerationState('Applying script polish...', () => void sendPolishCommand(), async () => {
      const data = await requestPolishScript({
        script: getCurrentScriptText(),
        mode: polishMode,
      })

      setPolishedScriptText(data.polished_script)
      if (scriptDraft) {
        await upsertSavedScript(scriptDraft, { notify: false, fullScriptBody: data.polished_script })
      }
      setPolishChat((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          message: `Applied polish mode: ${polishMode}.`,
        },
      ])
      setWorkflowStep(6)
      openToast('Script polished.')
    })
  }

  const copyScript = async () => {
    if (!scriptDraft) {
      return
    }

    await navigator.clipboard.writeText(getCurrentScriptText())
    openToast('Script copied.')
  }

  const downloadTxt = () => {
    if (!scriptDraft) {
      return
    }
    const blob = new Blob([getCurrentScriptText()], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${scriptDraft.script.title || 'script'}.txt`
    link.click()
    URL.revokeObjectURL(url)
    setWorkflowStep(7)
  }

  const downloadPdf = async () => {
    if (!scriptDraft) {
      return
    }

    const pdfTitle = scriptDraft.script.title || 'Untitled Script'
    const pdfContent = getCurrentScriptText()
    try {
      await downloadScriptPdf(pdfTitle, pdfContent)
      openToast('PDF downloaded.')
    } catch {
      openToast('Unable to download PDF.')
    }
    setWorkflowStep(7)
  }

  const updateScriptInLibraryState = (scriptId: string, updates: Partial<SavedScript>) => {
    setScripts((current) =>
      current.map((script) => (script.id === scriptId ? { ...script, ...updates, updatedAt: new Date().toISOString() } : script)),
    )
  }

  const saveEditedScriptTitle = async () => {
    if (!selectedScript || !authUserId || isSavingScriptDetail) {
      return
    }

    const nextTitle = titleDraft.trim()
    if (!nextTitle) {
      openToast('Title cannot be empty.')
      return
    }

    setIsSavingScriptDetail(true)
    try {
      await scriptService.updateScript(selectedScript.id, authUserId, {
        title: nextTitle,
        selected_title: nextTitle,
      })
      updateScriptInLibraryState(selectedScript.id, { title: nextTitle, selectedTitle: nextTitle })
      setIsEditingTitle(false)
      openToast('Title updated.')
    } catch {
      openToast('Unable to update script title.')
    } finally {
      setIsSavingScriptDetail(false)
    }
  }

  const saveEditedScriptOutline = async () => {
    if (!selectedScript || !authUserId || isSavingScriptDetail) {
      return
    }

    const nextOutlineSections = editableTextToOutlineSections(outlineDraft)
    setIsSavingScriptDetail(true)
    try {
      await scriptService.updateScript(selectedScript.id, authUserId, {
        outline: JSON.stringify(nextOutlineSections),
      })
      updateScriptInLibraryState(selectedScript.id, { outlineSections: nextOutlineSections })
      setIsEditingOutline(false)
      openToast('Outline updated.')
    } catch {
      openToast('Unable to update script outline.')
    } finally {
      setIsSavingScriptDetail(false)
    }
  }

  const saveEditedFullScript = async () => {
    if (!selectedScript || !authUserId || isSavingScriptDetail) {
      return
    }

    const nextScriptBody = fullScriptDraft.trim()
    if (!nextScriptBody) {
      openToast('Script cannot be empty.')
      return
    }

    setIsSavingScriptDetail(true)
    try {
      await scriptService.updateScript(selectedScript.id, authUserId, {
        full_script: nextScriptBody,
        word_count: nextScriptBody.length,
      })
      updateScriptInLibraryState(selectedScript.id, { fullScriptBody: nextScriptBody, script: nextScriptBody })
      setIsEditingScript(false)
      openToast('Script updated.')
    } catch {
      openToast('Unable to update full script.')
    } finally {
      setIsSavingScriptDetail(false)
    }
  }

  const exportSelectedScriptPdf = async () => {
    if (!selectedScript) {
      return
    }

    const pdfTitle = selectedScript.selectedTitle || selectedScript.title || 'Untitled Script'
    const pdfContent = selectedScript.fullScriptBody || selectedScript.script || 'No script content yet.'
    try {
      await downloadScriptPdf(pdfTitle, pdfContent)
      openToast('PDF downloaded.')
    } catch {
      openToast('Unable to download PDF.')
    }
  }

  const deleteSelectedScript = async () => {
    if (!selectedScript || !authUserId || isDeletingSelectedScript) {
      return
    }

    setIsDeletingSelectedScript(true)
    try {
      await scriptService.deleteScript(selectedScript.id, authUserId)
      setScripts((current) => current.filter((script) => script.id !== selectedScript.id))
      setSelectedScriptId('')
      setScriptDetailView('title')
      setIsDeleteScriptDialogOpen(false)
      openToast('Script deleted.')
    } catch {
      openToast('Unable to delete script.')
    } finally {
      setIsDeletingSelectedScript(false)
    }
  }

  const requestDeleteSelectedScript = () => {
    if (!selectedScript || !authUserId) {
      return
    }

    setIsDeleteScriptDialogOpen(true)
  }

  const recentScripts = scripts.slice(0, 5)

  if (screen === 'landing') {
    return (
      <main className="landing-page">
        <header className="landing-nav glass-panel">
          <ScriptrLogo />
          <div className="landing-nav-actions">
            <button className="btn ghost" onClick={() => setScreen('signin')}>
              Sign in
            </button>
            <Link to="/pricing" className="btn secondary">
              Pricing
            </Link>
            <button className="btn primary" onClick={() => setScreen('signup')}>
              Get Started
            </button>
          </div>
        </header>

        <section className="hero-section">
          <div className="hero-content reveal-up">
            <span className="chip">Premium AI workflow for faceless YouTube businesses</span>
            <h1>Write scripts that keep viewers watching.</h1>
            <p>
              Scriptr helps creators turn channel ideas into titles, outlines, and high-retention scripts built to
              scale content like a real media operation.
            </p>
            <div className="hero-cta">
              <button className="btn primary large" onClick={() => setScreen('signup')}>
                Build your channel system <ArrowRight className="icon-inline" />
              </button>
              <button className="btn secondary large" onClick={() => setScreen('signin')}>
                Sign in
              </button>
            </div>
          </div>
          <div className="hero-preview glass-panel reveal-up-delay">
            <div className="preview-header">
              <span>Workspace Preview</span>
              <span className="status-dot">Live</span>
            </div>
            <div className="preview-grid">
              <article className="preview-card">
                <h4>Generate New Script</h4>
                <p>From niche to full script in minutes.</p>
              </article>
              <article className="preview-card">
                <h4>Retention Hooks</h4>
                <p>Curiosity, shock, authority, storytelling.</p>
              </article>
              <article className="preview-card">
                <h4>Channel Profile</h4>
                <p>Voice, audience, cadence, and monetization aligned.</p>
              </article>
              <article className="preview-card">
                <h4>Pipeline Snapshot</h4>
                <p>12 scripts this month, 3 ready to publish.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="benefit-strip">
          <div>
            <span>From niche to script in minutes</span>
          </div>
          <div>
            <span>Built for faceless channel operators</span>
          </div>
          <div>
            <span>Packaging + scripting in one workflow</span>
          </div>
        </section>

        <section className="feature-section">
          <h2>Build and scale channels faster with AI</h2>
          <div className="feature-grid">
            <article className="feature-card glass-panel">
              <Lightbulb className="card-icon" />
              <h3>Profitable topic discovery</h3>
              <p>Generate monetizable concepts and angles with click potential indicators.</p>
            </article>
            <article className="feature-card glass-panel">
              <PenSquare className="card-icon" />
              <h3>High-retention script writer</h3>
              <p>Create complete script structures with strong openings, story beats, and CTA placements.</p>
            </article>
            <article className="feature-card glass-panel">
              <Target className="card-icon" />
              <h3>Packaging systems</h3>
              <p>Generate titles and packaging assets in a single guided production flow.</p>
            </article>
            <article className="feature-card glass-panel">
              <BarChart3 className="card-icon" />
              <h3>Scale operations</h3>
              <p>Save profiles, build reusable workflows, and speed up your team output.</p>
            </article>
          </div>
        </section>

        <section className="testimonial-section">
          <h2>Trusted by operators building faceless brands</h2>
          <div className="testimonial-grid">
            {TESTIMONIALS.map((item) => (
              <article key={item.author} className="testimonial-card glass-panel">
                <p>“{item.quote}”</p>
                <span>{item.author}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="faq-section">
          <h2>Frequently asked questions</h2>
          <div className="faq-list">
            {FAQ.map((item) => (
              <article key={item.q} className="faq-item glass-panel">
                <h4>{item.q}</h4>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="final-cta glass-panel">
          <h2>Turn ideas into revenue-ready content.</h2>
          <p>Launch your faceless channel with a scripting system that is built to compound.</p>
          <button className="btn primary large" onClick={() => setScreen('signup')}>
            Start with Scriptr
          </button>
        </section>
      </main>
    )
  }

  if (sessionLoading) {
    return (
      <main className="auth-page">
        <div className="auth-bg-glow" />
        <section className="auth-layout">
          <div className="auth-card glass-panel">
            <div className="auth-head">
              <h1>Restoring session</h1>
              <p>Loading account data from Supabase...</p>
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (screen === 'signin' || screen === 'signup' || screen === 'forgot' || screen === 'reset') {
    return (
      <main className="auth-page">
        <div className="auth-bg-glow" />
        <section className="auth-layout">
          <aside className="auth-visual glass-panel">
            <ScriptrLogo />
            <h2>Build your faceless channel like a real business.</h2>
            <p>
              Use structured AI workflows to create ideas, scripts, and packaging assets that convert viewers into
              loyal subscribers.
            </p>
            <div className="auth-visual-cards">
              <article>
                <Flame />
                <span>Viral-style concepts</span>
              </article>
              <article>
                <Play />
                <span>Retention-first scripts</span>
              </article>
              <article>
                <Check />
                <span>Save reusable channel systems</span>
              </article>
            </div>
          </aside>

          <div className="auth-card glass-panel">
            <div className="auth-head">
              <h1>
                {screen === 'signup'
                  ? 'Create your workspace'
                  : screen === 'forgot'
                    ? 'Password recovery'
                    : screen === 'reset'
                      ? 'Set a new password'
                      : 'Welcome back'}
              </h1>
              <p>
                {screen === 'signup'
                  ? 'Sign up to personalize Scriptr for your YouTube growth goals.'
                  : screen === 'forgot'
                    ? 'Enter your email and receive account recovery instructions.'
                    : screen === 'reset'
                      ? 'Choose a secure password for your account.'
                      : 'Sign in to continue building scripts and channel systems.'}
              </p>
            </div>

            {screen === 'signin' || screen === 'signup' ? (
              <form
                className="auth-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  onAuthSubmit(screen)
                }}
              >
                {screen === 'signup' && (
                  <label>
                    Name
                    <input
                      type="text"
                      value={authForm.name}
                      onChange={(event) => setAuthForm((value) => ({ ...value, name: event.target.value }))}
                      placeholder="Automation Muse Operator"
                    />
                  </label>
                )}
                <label>
                  Email
                  <input
                    type="email"
                    value={authForm.email}
                    onChange={(event) => setAuthForm((value) => ({ ...value, email: event.target.value }))}
                    placeholder="you@yourbrand.com"
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={(event) => setAuthForm((value) => ({ ...value, password: event.target.value }))}
                    placeholder="••••••••••"
                  />
                </label>
                {authError && <p className="error-text">{authError}</p>}
                <button type="submit" className="btn primary" disabled={authLoading}>
                  {authLoading
                    ? 'Please wait...'
                    : screen === 'signup'
                      ? 'Create account'
                      : 'Sign in'}
                </button>
              </form>
            ) : screen === 'forgot' ? (
              <form
                className="auth-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void submitForgotPassword()
                }}
              >
                <label>
                  Email
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(event) => setForgotEmail(event.target.value)}
                    placeholder="you@yourbrand.com"
                  />
                </label>
                {forgotStatus && <p className="muted-note">{forgotStatus}</p>}
                {authError && <p className="error-text">{authError}</p>}
                <button type="submit" className="btn primary" disabled={authLoading}>
                  Send recovery link
                </button>
              </form>
            ) : (
              <form
                className="auth-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void submitResetPassword()
                }}
              >
                <label>
                  New password
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(event) => setResetPassword(event.target.value)}
                    placeholder="••••••••••"
                  />
                </label>
                <label>
                  Confirm new password
                  <input
                    type="password"
                    value={resetPasswordConfirm}
                    onChange={(event) => setResetPasswordConfirm(event.target.value)}
                    placeholder="••••••••••"
                  />
                </label>
                {resetStatus && <p className="muted-note">{resetStatus}</p>}
                {authError && <p className="error-text">{authError}</p>}
                <button type="submit" className="btn primary" disabled={authLoading}>
                  Update password
                </button>
              </form>
            )}

            <div className="auth-footer-links">
              {screen === 'signin' && (
                <>
                  <button className="text-link" onClick={() => setScreen('forgot')}>
                    Forgot password?
                  </button>
                  <p>
                    New here?{' '}
                    <button className="text-link" onClick={() => setScreen('signup')}>
                      Create account
                    </button>
                  </p>
                </>
              )}
              {screen === 'signup' && (
                <p>
                  Already have an account?{' '}
                  <button className="text-link" onClick={() => setScreen('signin')}>
                    Sign in
                  </button>
                </p>
              )}
              {screen === 'forgot' && (
                <button className="text-link" onClick={() => setScreen('signin')}>
                  Back to sign in
                </button>
              )}
              {screen === 'reset' && (
                <button className="text-link" onClick={() => setScreen('signin')}>
                  Back to sign in
                </button>
              )}
              <button className="text-link muted" onClick={() => setScreen('landing')}>
                Return to website
              </button>
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (screen === 'onboarding') {
    const progress = (onboardingStep / ONBOARDING_TOTAL_STEPS) * 100

    return (
      <main className="onboarding-page">
        <div className="onboarding-shell glass-panel">
          <div className="onboarding-head">
            <ScriptrLogo />
            <span className="chip">
              Step {onboardingStep} of {ONBOARDING_TOTAL_STEPS}
            </span>
          </div>

          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <section className="onboarding-content">
            {onboardingStep === 1 && (
              <OnboardingWelcome onNext={nextOnboarding} userName={authUser?.name || 'Creator'} />
            )}

            {onboardingStep === 2 && (
              <OnboardingChoiceStep
                title="What niche is your channel in?"
                subtitle="Pick a focus to tailor your strategy, ideation, and script outputs."
                options={NICHE_OPTIONS}
                value={onboarding.niche}
                onSelect={(value) => persistOnboarding({ ...onboarding, niche: value })}
                customLabel="Custom niche"
                customValue={onboarding.customNiche}
                onCustomChange={(value) => persistOnboarding({ ...onboarding, customNiche: value })}
              />
            )}

            {onboardingStep === 3 && (
              <OnboardingTextStep
                title="What is your channel name?"
                subtitle="This will be used as your only channel profile across the workspace."
                label="Channel name"
                value={onboarding.channelName}
                onChange={(value) => persistOnboarding({ ...onboarding, channelName: value })}
                placeholder="The Script Engine"
              />
            )}

            {onboardingStep === 4 && (
              <OnboardingChoiceStep
                title="Where are you in your YouTube journey?"
                subtitle="Scriptr adapts recommendations to your current stage."
                options={STAGE_OPTIONS}
                value={onboarding.stage}
                onSelect={(value) => persistOnboarding({ ...onboarding, stage: value })}
              />
            )}

            {onboardingStep === 5 && (
              <OnboardingChoiceStep
                title="What type of videos do you want to create?"
                subtitle="Choose the format mix Scriptr should optimize for first."
                options={CONTENT_OPTIONS}
                value={onboarding.contentStyle}
                onSelect={(value) => persistOnboarding({ ...onboarding, contentStyle: value })}
              />
            )}

            {onboardingStep === 6 && (
              <OnboardingChoiceStep
                title="How many videos do you want to post per month?"
                subtitle="Select your monthly posting cadence."
                options={FREQUENCY_OPTIONS}
                value={onboarding.uploadFrequency}
                onSelect={(value) => persistOnboarding({ ...onboarding, uploadFrequency: value })}
              />
            )}

            {onboardingStep === 7 && (
              <OnboardingChoiceStep
                title="What tone should your scripts have?"
                subtitle="Choose your default brand voice for generated scripts."
                options={TONE_OPTIONS}
                value={onboarding.tone}
                onSelect={(value) => persistOnboarding({ ...onboarding, tone: value })}
                customLabel="Custom tone"
                customValue={onboarding.customTone}
                onCustomChange={(value) => persistOnboarding({ ...onboarding, customTone: value })}
              />
            )}

            {onboardingStep === 8 && (
              <OnboardingAudienceStep onboarding={onboarding} onChange={(value) => persistOnboarding(value)} />
            )}

            {onboardingStep === 9 && (
              <OnboardingChoiceStep
                title="What do you want Scriptr to help you do first?"
                subtitle="Your first dashboard actions will be personalized based on this goal."
                options={PRIMARY_GOALS}
                value={onboarding.primaryGoal}
                onSelect={(value) => persistOnboarding({ ...onboarding, primaryGoal: value })}
              />
            )}

            {onboardingStep === 10 && <OnboardingCompletionStep onboarding={onboarding} userName={authUser?.name || 'Creator'} />}
          </section>

          {onboardingStep > 1 && onboardingStep < ONBOARDING_TOTAL_STEPS && (
            <div className="onboarding-actions">
              <button type="button" className="btn secondary" onClick={previousOnboarding}>
                Previous
              </button>
              <button type="button" className="btn primary" onClick={nextOnboarding}>
                Next <ChevronRight className="icon-inline" />
              </button>
            </div>
          )}

          {onboardingStep === ONBOARDING_TOTAL_STEPS && (
            <div className="onboarding-actions">
              <button type="button" className="btn primary" onClick={nextOnboarding} disabled={isCompletingOnboarding}>
                {isCompletingOnboarding ? 'Entering Dashboard...' : 'Enter Dashboard'} {!isCompletingOnboarding && <ArrowRight className="icon-inline" />}
              </button>
            </div>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'open' : ''}`}>
        <div className="sidebar-head">
          <ScriptrLogo compact={false} />
          <button className="icon-btn mobile-only" onClick={() => setMobileNavOpen(false)}>
            <X />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                className={`nav-item ${activeNav === item.key ? 'active' : ''}`}
                onClick={() => {
                  setActiveNav(item.key)
                  setMobileNavOpen(false)
                }}
              >
                <Icon className="nav-icon" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <footer className="sidebar-foot glass-panel">
          <div>
            <p>{authUser?.name || 'Creator'}</p>
            <span>{authUser?.email || 'you@example.com'}</span>
          </div>
          <button className="btn secondary" onClick={onLogout}>
            Sign out
          </button>
        </footer>
      </aside>

      <section className="main-area">
        <header className="main-topbar">
          <button className="icon-btn mobile-only" onClick={() => setMobileNavOpen(true)}>
            <Menu />
          </button>
          <ScriptrLogo compact />
          <button className="btn secondary">Upgrade</button>
        </header>

        <div className="page-body">
          {activeNav === 'dashboard' && (
            <section className="dashboard-page menu-transition-surface">
              <header className="page-header">
                <h1>Welcome back, {authUser?.name || 'Creator'}</h1>
                <p>Channel profile summary only.</p>
              </header>

              <section className="panel glass-panel">
                <h3>Channel Profile Summary</h3>
                <p>
                  <strong>{selectedProfile.channelName}</strong>
                </p>
                <p>{selectedProfile.description}</p>
                <div className="tag-row">
                  <span className="tag">{selectedProfile.niche}</span>
                  <span className="tag">{selectedProfile.tone}</span>
                  <span className="tag">{selectedProfile.frequency}</span>
                </div>
                <p>
                  <strong>Audience:</strong> {selectedProfile.audience}
                </p>
                <button className="btn primary" onClick={() => setActiveNav('generate')}>
                  Open Generate Journey
                </button>
              </section>
            </section>
          )}

          {activeNav === 'generate' && (
            <section className="generate-page menu-transition-surface">
              <header className="page-header">
                <h1>Scriptr AI Studio</h1>
                <p>Go from idea to script in six guided steps with real AI outputs.</p>
              </header>

              <div className={`generation-layout ${journeyFocused ? 'journey-focused' : ''}`}>
                {!journeyFocused && (
                  <section className="panel glass-panel variables-panel">
                    <h3>Generation Variables</h3>
                    <div className="form-grid">
                      <label>
                        Niche
                        <input value={channelContext.niche} readOnly />
                      </label>
                      <label>
                        Video topic idea
                        <input
                          value={channelContext.videoTopicIdea}
                          onChange={(event) =>
                            setChannelContext((value) => ({ ...value, videoTopicIdea: event.target.value }))
                          }
                          placeholder="Roman history"
                        />
                      </label>
                      <label>
                        Target audience
                        <input
                          value={channelContext.targetAudience}
                          onChange={(event) =>
                            setChannelContext((value) => ({ ...value, targetAudience: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Tone
                        <input
                          value={channelContext.tone}
                          onChange={(event) =>
                            setChannelContext((value) => ({ ...value, tone: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Video length
                        <input
                          value={channelContext.videoLength}
                          onChange={(event) =>
                            setChannelContext((value) => ({ ...value, videoLength: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Video format
                        <input
                          value={channelContext.videoFormat}
                          onChange={(event) =>
                            setChannelContext((value) => ({ ...value, videoFormat: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Example channels
                        <input
                          value={(channelContext.exampleChannels || []).join(', ')}
                          onChange={(event) =>
                            setChannelContext((value) => ({
                              ...value,
                              exampleChannels: event.target.value
                                .split(',')
                                .map((item) => item.trim())
                                .filter(Boolean),
                            }))
                          }
                          placeholder="Channel A, Channel B"
                        />
                      </label>
                      <label>
                        User notes
                        <input
                          value={channelContext.userNotes || ''}
                          onChange={(event) => setChannelContext((value) => ({ ...value, userNotes: event.target.value }))}
                          placeholder="Any specific direction or constraints"
                        />
                      </label>
                    </div>

                    <div className="action-row">
                      <button className="btn primary" onClick={generateIdeas} disabled={isGenerating}>
                        Generate Video Ideas
                      </button>
                      <button className="btn secondary" onClick={() => setActiveNav('scripts')}>
                        Open Scripts Library
                      </button>
                    </div>
                  </section>
                )}

                <section className="panel glass-panel journey-panel">
                  <div className="journey-header">
                    <span className="chip">Generation Journey</span>
                    <div className="journey-header-actions">
                      <span className="journey-status">{workflowStep}/7 complete</span>
                      {journeyFocused && (
                        <button className="btn secondary journey-back-btn" onClick={() => setJourneyFocused(false)}>
                          Change Variables
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="tabs-row">
                    {WORKFLOW_STEPS.map((step) => (
                      <button
                        key={step.id}
                        className={`tab-pill ${workflowStep === step.id ? 'active' : ''}`}
                        onClick={() => setWorkflowStep(step.id)}
                      >
                        {step.label}
                      </button>
                    ))}
                  </div>

                  {isGenerating ? (
                    <div className={`skeleton-stack ${loadingMessage === 'Conducting outlier research...' ? 'premium-loading' : ''}`}>
                      <p className="loading-primary">{loadingMessage || 'Generating...'}</p>
                      {loadingSubMessages.length > 0 ? (
                        <p className="loading-secondary">{loadingSubMessages[loadingSubMessageIndex] || loadingSubMessages[0]}</p>
                      ) : null}
                      <div className="card-grid three">
                        <div className="skeleton premium-skeleton" />
                        <div className="skeleton premium-skeleton" />
                        <div className="skeleton premium-skeleton" />
                      </div>
                    </div>
                  ) : (
                    <>
                      {generationError ? (
                        <article className="result-card">
                          <h4>Generation Error</h4>
                          <p>{generationError}</p>
                          {retryAction && (
                            <button className="btn secondary" onClick={retryAction}>
                              Retry
                            </button>
                          )}
                        </article>
                      ) : null}

                      {workflowStep === 1 && (
                        <div className="content-stack">
                          <h3>Step 1: Channel Context</h3>
                          <p>Set your channel variables on the left, then run idea generation to begin the pipeline.</p>
                          <div className="action-row">
                            <button className="btn primary" onClick={generateIdeas}>
                              Continue to Video Ideas
                            </button>
                          </div>
                        </div>
                      )}

                      {workflowStep === 2 && (
                        <div className="content-stack">
                          <h3>Step 2: Video Ideas</h3>
                          {!videoIdeas.length ? (
                            <div className="empty-state">
                              <Sparkles className="empty-icon" />
                              <h3>Generate ideas to begin</h3>
                              <p>Set your variables, then click Generate Ideas.</p>
                            </div>
                          ) : null}
                          <div className="card-grid">
                            {videoIdeas.slice(0, 3).map((idea, index) => {
                              const outlierStatus = normalizeOutlierStatus(idea.outlierStatus)

                              return (
                                <article
                                  className={`result-card clickable-card ${selectedIdeaIndex === index ? 'active' : ''}`}
                                  key={`${idea.title}-${index}`}
                                  onClick={() => void generateTitlesForIdea(index)}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.preventDefault()
                                      void generateTitlesForIdea(index)
                                    }
                                  }}
                                >
                                  <h4>{idea.title}</h4>
                                  <p>{idea.concept}</p>
                                  <p>
                                    <strong>Why it works:</strong> {idea.why_it_works}
                                  </p>
                                  <p>
                                    <strong>Hook angle:</strong> {idea.hook_angle}
                                  </p>
                                  <div className="idea-card-footer">
                                    <span className="tag">Click score: {idea.click_score}</span>
                                    <span className={`outlier-bubble status-${outlierStatus.toLowerCase()}`}>Outlier: {outlierStatus}</span>
                                  </div>
                                </article>
                              )
                            })}
                          </div>
                          <div className="action-row">
                            <button className="btn secondary" onClick={generateIdeas}>
                              Regenerate Ideas
                            </button>
                          </div>
                        </div>
                      )}

                      {workflowStep === 3 && titleOptions && (
                        <div className="content-stack">
                          <h3>Step 3: Potential Titles</h3>
                          <div className="card-grid">
                            {titleOptions.titles.map((title) => (
                              <article
                                className={`result-card clickable-card ${selectedTitle === title ? 'active' : ''}`}
                                key={title}
                                onClick={() => void chooseTitleAndBuildOutline(title)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    void chooseTitleAndBuildOutline(title)
                                  }
                                }}
                              >
                                <h4>{title}</h4>
                              </article>
                            ))}
                          </div>
                          <div className="action-row">
                            <button
                              className="btn secondary"
                              onClick={() => {
                                if (selectedIdeaIndex !== null) {
                                  void generateTitlesForIdea(selectedIdeaIndex)
                                }
                              }}
                              disabled={selectedIdeaIndex === null}
                            >
                              Regenerate
                            </button>
                          </div>
                        </div>
                      )}

                      {workflowStep === 4 && outlineBlocks.length > 0 && (
                        <div className="content-stack">
                          <h3>Step 4: Outline</h3>
                          <div className="card-grid">
                            {outlineBlocks.map((section) => (
                              <article className="result-card" key={section.section}>
                                <h4>{section.section}</h4>
                                <p>{section.content}</p>
                              </article>
                            ))}
                          </div>
                          <div className="action-row">
                            <button className="btn primary" onClick={generateScript}>
                              Continue to Full Script
                            </button>
                          </div>
                        </div>
                      )}

                      {workflowStep === 5 && scriptDraft && (
                        <div className="content-stack">
                          <h3>Step 5: Full Script</h3>
                          <article className="script-panel">
                            <h4>Title</h4>
                            <p>{scriptDraft.script.title}</p>
                            {scriptDraft.script.sections.map((section, index) => (
                              <div key={`${section.section}-${index}`}>
                                <h4>{section.section}</h4>
                                <p>{section.text}</p>
                              </div>
                            ))}
                          </article>
                          <div className="action-row">
                            <button className="btn secondary" onClick={copyScript}>
                              Copy Script
                            </button>
                            <button className="btn secondary" onClick={downloadTxt}>
                              Download TXT
                            </button>
                            <button className="btn secondary" onClick={() => void generateScript()}>
                              Regenerate Script
                            </button>
                            <button className="btn primary" onClick={() => setWorkflowStep(6)}>
                              Continue to Polish
                            </button>
                          </div>
                        </div>
                      )}

                      {workflowStep === 6 && scriptDraft && (
                        <div className="content-stack">
                          <h3>Step 6: Polish</h3>
                          <div className="chat-thread">
                            {polishChat.length === 0 ? (
                              <p className="muted-note">Choose a polish mode to rewrite the script safely.</p>
                            ) : (
                              polishChat.map((message) => (
                                <article key={message.id} className={`result-card ${message.role === 'assistant' ? 'assistant' : ''}`}>
                                  <h4>{message.role === 'assistant' ? 'AI Assistant' : 'You'}</h4>
                                  <p>{message.message}</p>
                                </article>
                              ))
                            )}
                          </div>
                          <div className="action-row wrap">
                            <select value={polishMode} onChange={(event) => setPolishMode(event.target.value as typeof polishMode)}>
                              <option value="retention">Improve retention</option>
                              <option value="shorten">Shorten script</option>
                              <option value="expand">Expand script</option>
                              <option value="simplify">Simplify language</option>
                              <option value="intensify">Intensify storytelling</option>
                            </select>
                            <button className="btn primary" onClick={sendPolishCommand}>
                              Apply Polish
                            </button>
                          </div>
                          {polishedScriptText ? (
                            <article className="result-card">
                              <h4>Polished Script</h4>
                              <p style={{ whiteSpace: 'pre-wrap' }}>{polishedScriptText}</p>
                            </article>
                          ) : null}
                          <div className="action-row">
                            <button className="btn secondary" onClick={() => setWorkflowStep(7)}>
                              Continue to Download
                            </button>
                          </div>
                        </div>
                      )}

                      {workflowStep === 7 && scriptDraft && (
                        <div className="content-stack">
                          <h3>Step 7: Download / Export</h3>
                          <p>Export your final script and keep it in the Scripts Library.</p>
                          <div className="action-row">
                            <button className="btn secondary" onClick={copyScript}>
                              Copy Script
                            </button>
                            <button className="btn secondary" onClick={downloadPdf}>
                              Download PDF
                            </button>
                          </div>
                        </div>
                      )}

                      {workflowStep > 1 &&
                      ((workflowStep === 3 && !titleOptions) ||
                        (workflowStep === 4 && !outlineBlocks.length) ||
                        (workflowStep >= 5 && !scriptDraft)) ? (
                        <div className="empty-state">
                          <Sparkles className="empty-icon" />
                          <h3>Continue the guided flow</h3>
                          <p>Complete each generation step to unlock the next output.</p>
                        </div>
                      ) : null}
                    </>
                  )}
                </section>

                {!journeyFocused && (
                  <section className="panel glass-panel recent-scripts-panel">
                  <h3>Recent Scripts</h3>
                  {recentScripts.length ? (
                    <ul className="simple-list">
                      {recentScripts.map((script) => (
                        <li key={script.id}>
                          <span>{script.title}</span>
                          <small>{script.date}</small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="empty-state">
                      <h3>No scripts yet</h3>
                      <p>Run the workflow to auto-save scripts in your library.</p>
                    </div>
                  )}
                  </section>
                )}
              </div>
            </section>
          )}

          {activeNav === 'scripts' && (
            <section className="scripts-page menu-transition-surface">
              <header className="page-header">
                <h1>Saved Scripts Library</h1>
                <p>Search, filter, and manage scripts for your channel.</p>
              </header>

              <div className="library-toolbar panel glass-panel">
                <input placeholder="Search scripts" />
                <select>
                  <option>All niches</option>
                  <option>AI tools</option>
                  <option>Finance</option>
                  <option>Luxury</option>
                </select>
                <select>
                  <option>Sort: Recent</option>
                  <option>Sort: Favorites</option>
                  <option>Sort: Status</option>
                </select>
              </div>

              {!selectedScript ? (
                <section className="panel glass-panel library-cards-panel inner-menu-surface">
                  <h3>Script Cards</h3>
                  {scripts.length ? (
                    <div className="library-card-grid">
                      {scripts.map((script) => (
                        <article
                          className={`script-card ${selectedScriptId === script.id ? 'active' : ''}`}
                          key={script.id}
                          onClick={() => {
                            setSelectedScriptId(script.id)
                            setScriptDetailView('title')
                          }}
                        >
                          <h4>{script.title}</h4>
                          <p>{script.date}</p>
                          <div className="tag-row">
                            <span className="tag">{script.profile}</span>
                            <span className="tag">{script.type}</span>
                            <span className="tag">{script.status}</span>
                          </div>
                          <div className="mini-actions">
                            <button
                              className="btn tiny"
                              onClick={(event) => {
                                event.stopPropagation()
                                toggleFavoriteScript(script.id)
                              }}
                            >
                              {script.favorite ? 'Unfavorite' : 'Favorite'}
                            </button>
                            <button className="btn tiny">Archive</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No scripts yet"
                      text="Create your first script in the Generate workspace."
                      cta="Generate script"
                      onClick={() => setActiveNav('generate')}
                    />
                  )}
                </section>
              ) : (
                <section className="panel glass-panel script-detail-screen inner-menu-surface">
                  <div className="script-detail-header">
                    <button
                      className="btn secondary"
                      onClick={() => {
                        setSelectedScriptId('')
                        setScriptDetailView('title')
                      }}
                    >
                      Back to Script Cards
                    </button>
                    <div className="tag-row">
                      <span className="tag">{selectedScript.date}</span>
                      <span className="tag">{selectedScript.niche}</span>
                      <span className="tag">{selectedScript.status}</span>
                    </div>
                    <div className="action-row wrap">
                      <button className="btn secondary" onClick={exportSelectedScriptPdf}>
                        Export
                      </button>
                      <button className="btn ghost" onClick={requestDeleteSelectedScript}>
                        Delete
                      </button>
                    </div>
                  </div>
                  <h3 className="script-detail-title">{selectedScript.title}</h3>
                  <div className="action-row wrap detail-switcher">
                    <button
                      className={`btn secondary ${scriptDetailView === 'title' ? 'active-filter' : ''}`}
                      onClick={() => setScriptDetailView('title')}
                    >
                      Title
                    </button>
                    <button
                      className={`btn secondary ${scriptDetailView === 'outline' ? 'active-filter' : ''}`}
                      onClick={() => setScriptDetailView('outline')}
                    >
                      Outline
                    </button>
                    <button
                      className={`btn secondary ${scriptDetailView === 'full' ? 'active-filter' : ''}`}
                      onClick={() => setScriptDetailView('full')}
                    >
                      Full Script
                    </button>
                  </div>
                  <div className="script-detail-content">
                    <div key={scriptDetailView} className="script-detail-pane">
                      {scriptDetailView === 'title' &&
                        (isEditingTitle ? (
                          <input value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} maxLength={220} />
                        ) : (
                          <p>{selectedScript.selectedTitle || selectedScript.title}</p>
                        ))}
                      {scriptDetailView === 'outline' &&
                        (isEditingOutline ? (
                          <textarea
                            value={outlineDraft}
                            onChange={(event) => setOutlineDraft(event.target.value)}
                            rows={16}
                            placeholder="Enter outline sections. Put heading on first line of each section, then content below."
                          />
                        ) : selectedScript.outlineSections.length ? (
                          <div className="outline-list">
                            {selectedScript.outlineSections.map((outline, index) => (
                              <article key={`${outline.heading}-${index}`} className="outline-item">
                                <h5>{outline.heading}</h5>
                                <p>{outline.content}</p>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <p>No outline saved for this script yet.</p>
                        ))}
                      {scriptDetailView === 'full' &&
                        (isEditingScript ? (
                          <textarea value={fullScriptDraft} onChange={(event) => setFullScriptDraft(event.target.value)} rows={18} />
                        ) : (
                          <pre>{selectedScript.fullScriptBody || selectedScript.script}</pre>
                        ))}
                    </div>
                  </div>
                  <div className="action-row wrap">
                    {scriptDetailView === 'title' && (
                      <button
                        className="btn secondary"
                        onClick={() => {
                          if (isEditingTitle) {
                            void saveEditedScriptTitle()
                            return
                          }
                          setTitleDraft(selectedScript.selectedTitle || selectedScript.title)
                          setIsEditingTitle(true)
                        }}
                        disabled={isSavingScriptDetail}
                      >
                        {isSavingScriptDetail && isEditingTitle ? 'Saving...' : isEditingTitle ? 'Save title' : 'Edit title'}
                      </button>
                    )}
                    {scriptDetailView === 'outline' && (
                      <button
                        className="btn secondary"
                        onClick={() => {
                          if (isEditingOutline) {
                            void saveEditedScriptOutline()
                            return
                          }
                          setOutlineDraft(outlineSectionsToEditableText(selectedScript.outlineSections))
                          setIsEditingOutline(true)
                        }}
                        disabled={isSavingScriptDetail}
                      >
                        {isSavingScriptDetail && isEditingOutline ? 'Saving...' : isEditingOutline ? 'Save outline' : 'Edit outline'}
                      </button>
                    )}
                    {scriptDetailView === 'full' && (
                      <button
                        className="btn secondary"
                        onClick={() => {
                          if (isEditingScript) {
                            void saveEditedFullScript()
                            return
                          }
                          setFullScriptDraft(selectedScript.fullScriptBody || selectedScript.script)
                          setIsEditingScript(true)
                        }}
                        disabled={isSavingScriptDetail}
                      >
                        {isSavingScriptDetail && isEditingScript ? 'Saving...' : isEditingScript ? 'Save script' : 'Edit script'}
                      </button>
                    )}
                  </div>
                </section>
              )}
            </section>
          )}

          {activeNav === 'profiles' && (
            <section className="profiles-page menu-transition-surface">
              <header className="page-header">
                <h1>Channel Profile</h1>
                <p>This workspace uses one channel profile from onboarding.</p>
              </header>

              <article className="panel glass-panel">
                <h3>{selectedProfile.channelName}</h3>
                <p>{selectedProfile.description}</p>
                <div className="tag-row">
                  <span className="tag">{selectedProfile.niche}</span>
                  <span className="tag">{selectedProfile.tone}</span>
                  <span className="tag">{selectedProfile.frequency}</span>
                </div>
                <p>
                  <strong>Audience:</strong> {selectedProfile.audience}
                </p>
              </article>
            </section>
          )}

          {activeNav === 'usage' && (
            <section className="usage-page menu-transition-surface">
              <header className="page-header">
                <h1>Analytics & Usage</h1>
                <p>Track script output, style distribution, and plan utilization.</p>
              </header>

              <div className="stat-grid">
                <StatCard
                  title="Scripts this month"
                  value={String(scriptsThisMonthCount)}
                  meta={`${currentMonthLabel} generations`}
                />
                <StatCard title="Favorite niche" value={favoriteNiche} meta={`${scripts.length} total saved scripts`} />
                <StatCard title="Most-used tone" value={mostUsedTone} meta="Based on saved script history" />
              </div>

              <div className="content-grid two">
                <section className="panel glass-panel">
                  <h3>Recent Scripts</h3>
                  {recentScripts.length ? (
                    <ul className="simple-list">
                      {recentScripts.map((script) => (
                        <li key={script.id}>
                          <span>{script.title}</span>
                          <small>{script.date}</small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No recent scripts yet.</p>
                  )}
                </section>
                <section className="panel glass-panel">
                  <h3>Productivity metrics</h3>
                  <p>Average generation time: 2m 14s</p>
                  <p>Outline-to-script conversion: 78%</p>
                  <p>
                    Last active:{' '}
                    {usageStats?.last_active_at ? new Date(usageStats.last_active_at).toLocaleDateString() : 'No activity yet'}
                  </p>
                </section>
              </div>
            </section>
          )}

          {activeNav === 'billing' && (
            <section className="billing-page menu-transition-surface">
              <header className="page-header">
                <h1>Billing & Plans</h1>
                <p>Choose the plan that fits your content engine and team output goals.</p>
              </header>

              <div className="pricing-grid">
                <PricingCard
                  name="Starter"
                  price="$29"
                  scripts="30 scripts/month"
                  features={['Topic + hook generation', 'Outline builder', '1 channel profile']}
                  cta="Current Plan"
                  muted
                />
                <PricingCard
                  name="Pro"
                  price="$79"
                  scripts="120 scripts/month"
                  features={['Everything in Starter', 'Full script writer', 'Repurpose suite', '5 channel profiles']}
                  cta="Upgrade to Pro"
                />
                <PricingCard
                  name="Scale"
                  price="$199"
                  scripts="Unlimited scripts"
                  features={['Everything in Pro', 'Team workflows', 'Priority support', 'Advanced analytics']}
                  cta="Contact Sales"
                />
              </div>

              <section className="panel glass-panel">
                <h3>Payment method</h3>
                <p>Add billing card and invoicing details here. This section is wired as a production-ready placeholder.</p>
                <button className="btn secondary">Manage billing details</button>
              </section>
            </section>
          )}

          {activeNav === 'settings' && (
            <section className="settings-page menu-transition-surface">
              <header className="page-header">
                <h1>Account Settings</h1>
                <p>Manage profile information, preferences, defaults, and notifications.</p>
              </header>

              <div className="content-grid two">
                <section className="panel glass-panel">
                  <h3>Profile info</h3>
                  <div className="form-grid">
                    <label>
                      Name
                      <input value={authUser?.name || ''} readOnly />
                    </label>
                    <label>
                      Email
                      <input value={authUser?.email || ''} readOnly />
                    </label>
                    <label>
                      Default channel profile
                      <select>
                        {profiles.map((profile) => (
                          <option key={profile.id}>{profile.channelName}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Default tone
                      <input value={onboarding.tone || 'Authoritative'} readOnly />
                    </label>
                  </div>
                </section>

                <section className="panel glass-panel">
                  <h3>Preferences</h3>
                  <ul className="simple-list">
                    <li>
                      <span>Email notifications</span>
                      <button className="btn tiny">Enabled</button>
                    </li>
                    <li>
                      <span>Weekly strategy summary</span>
                      <button className="btn tiny">Enabled</button>
                    </li>
                    <li>
                      <span>Default output style</span>
                      <button className="btn tiny">Retention-first</button>
                    </li>
                    <li>
                      <span>Password reset</span>
                      <button className="btn tiny" onClick={() => setScreen('forgot')}>
                        Open flow
                      </button>
                    </li>
                  </ul>
                </section>
              </div>
            </section>
          )}
        </div>
      </section>

      <nav className="mobile-bottom-nav">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              className={activeNav === item.key ? 'active' : ''}
              onClick={() => setActiveNav(item.key)}
            >
              <Icon className="nav-icon" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {isDeleteScriptDialogOpen && selectedScript && (
        <div
          className="confirm-dialog-backdrop"
          role="presentation"
          onClick={() => {
            if (isDeletingSelectedScript) {
              return
            }
            setIsDeleteScriptDialogOpen(false)
          }}
        >
          <section
            className="confirm-dialog glass-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-script-title"
            aria-describedby="delete-script-description"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="delete-script-title">Delete script?</h3>
            <p id="delete-script-description">
              This will permanently remove <strong>{selectedScript.selectedTitle || selectedScript.title}</strong> from your
              scripts library.
            </p>
            <div className="confirm-dialog-actions">
              <button
                className="btn secondary"
                onClick={() => setIsDeleteScriptDialogOpen(false)}
                disabled={isDeletingSelectedScript}
              >
                Cancel
              </button>
              <button className="btn danger" onClick={() => void deleteSelectedScript()} disabled={isDeletingSelectedScript}>
                {isDeletingSelectedScript ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && (
        <aside className="toast">
          <CircleUserRound className="icon-inline" />
          {toast}
        </aside>
      )}
    </main>
  )
}

function StatCard({ title, value, meta }: { title: string; value: string; meta: string }) {
  return (
    <article className="stat-card glass-panel">
      <h3>{title}</h3>
      <p>{value}</p>
      <span>{meta}</span>
    </article>
  )
}

function PricingCard({
  name,
  price,
  scripts,
  features,
  cta,
  muted,
}: {
  name: string
  price: string
  scripts: string
  features: string[]
  cta: string
  muted?: boolean
}) {
  return (
    <article className={`pricing-card glass-panel ${muted ? 'muted' : ''}`}>
      <h3>{name}</h3>
      <p className="pricing-value">{price}</p>
      <span>{scripts}</span>
      <ul>
        {features.map((feature) => (
          <li key={feature}>
            <Check className="icon-inline" />
            {feature}
          </li>
        ))}
      </ul>
      <button className={`btn ${muted ? 'secondary' : 'primary'}`}>{cta}</button>
    </article>
  )
}

function EmptyState({
  title,
  text,
  cta,
  onClick,
}: {
  title: string
  text: string
  cta: string
  onClick: () => void
}) {
  return (
    <div className="empty-state">
      <Sparkles className="empty-icon" />
      <h3>{title}</h3>
      <p>{text}</p>
      <button className="btn primary" onClick={onClick}>
        {cta}
      </button>
    </div>
  )
}

function OnboardingWelcome({ onNext, userName }: { onNext: () => void; userName: string }) {
  return (
    <div className="onboarding-step fade-step">
      <h1>Welcome to Scriptr, {userName}</h1>
      <p>
        Scriptr will customize your workspace for channel goals, audience, and content strategy. This takes about two
        minutes.
      </p>
      <button className="btn primary" onClick={onNext}>
        Let's build your channel system <ArrowRight className="icon-inline" />
      </button>
    </div>
  )
}

function OnboardingChoiceStep({
  title,
  subtitle,
  options,
  value,
  onSelect,
  customLabel,
  customValue,
  onCustomChange,
}: {
  title: string
  subtitle: string
  options: string[]
  value: string
  onSelect: (value: string) => void
  customLabel?: string
  customValue?: string
  onCustomChange?: (value: string) => void
}) {
  return (
    <div className="onboarding-step fade-step">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div className="choice-grid">
        {options.map((option) => (
          <button
            key={option}
            className={`choice-card ${value === option ? 'active' : ''}`}
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
      {customLabel && (
        <label>
          {customLabel}
          <input
            value={customValue || ''}
            onChange={(event) => onCustomChange?.(event.target.value)}
            placeholder="Add custom value"
          />
        </label>
      )}
    </div>
  )
}

function OnboardingTextStep({
  title,
  subtitle,
  label,
  value,
  onChange,
  placeholder,
}: {
  title: string
  subtitle: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="onboarding-step fade-step">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <label>
        {label}
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      </label>
    </div>
  )
}

function OnboardingAudienceStep({
  onboarding,
  onChange,
}: {
  onboarding: OnboardingState
  onChange: (value: OnboardingState) => void
}) {
  return (
    <div className="onboarding-step fade-step">
      <h1>Who are you creating for?</h1>
      <p>Define your target viewer so scripts match their context, pain points, and aspirations.</p>
      <div className="form-grid">
        <label>
          Target audience description
          <textarea
            value={onboarding.audienceDescription}
            onChange={(event) => onChange({ ...onboarding, audienceDescription: event.target.value })}
            placeholder="Founders and operators trying to scale YouTube channels"
          />
        </label>
        <label>
          Age range (optional)
          <input
            value={onboarding.ageRange}
            onChange={(event) => onChange({ ...onboarding, ageRange: event.target.value })}
            placeholder="22-45"
          />
        </label>
        <label>
          Pain points / aspirations
          <textarea
            value={onboarding.painPoints}
            onChange={(event) => onChange({ ...onboarding, painPoints: event.target.value })}
            placeholder="Wants a repeatable scripting system and better retention"
          />
        </label>
      </div>
    </div>
  )
}

function OnboardingCompletionStep({ onboarding, userName }: { onboarding: OnboardingState; userName: string }) {
  return (
    <div className="onboarding-step fade-step">
      <h1>Your workspace is ready, {userName}.</h1>
      <p>Scriptr configured your content system for high-retention faceless video production.</p>
      <div className="completion-grid">
        <article className="glass-panel">
          <h4>Channel Name</h4>
          <p>{onboarding.channelName || 'Not set'}</p>
        </article>
        <article className="glass-panel">
          <h4>Niche</h4>
          <p>{onboarding.customNiche || onboarding.niche || 'Not set'}</p>
        </article>
        <article className="glass-panel">
          <h4>Tone</h4>
          <p>{onboarding.customTone || onboarding.tone || 'Not set'}</p>
        </article>
        <article className="glass-panel">
          <h4>Videos Per Month</h4>
          <p>{onboarding.uploadFrequency || 'Not set'}</p>
        </article>
        <article className="glass-panel">
          <h4>Content Style</h4>
          <p>{onboarding.contentStyle || 'Not set'}</p>
        </article>
        <article className="glass-panel">
          <h4>Primary Goal</h4>
          <p>{onboarding.primaryGoal || 'Not set'}</p>
        </article>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/')({
  component: Home,
})
