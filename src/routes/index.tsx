import { createFileRoute } from '@tanstack/react-router'
import {
  AuthError,
  MissingIdentityError,
  getUser,
  handleAuthCallback,
  login,
  logout,
  signup,
} from '@netlify/identity'
import { useEffect, useMemo, useState } from 'react'
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

type Screen = 'landing' | 'signin' | 'signup' | 'forgot' | 'onboarding' | 'app'
type NavKey = 'dashboard' | 'generate' | 'scripts' | 'profiles' | 'usage' | 'billing' | 'settings'
type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6 | 7

type ChannelProfile = {
  id: string
  channelName: string
  niche: string
  description: string
  audience: string
  tone: string
  length: string
  ctaStyle: string
  frequency: string
  monetizationGoal: string
  pillars: string
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
  incomeGoal: string
  contentStyle: string
  uploadFrequency: string
  tone: string
  customTone: string
  audienceDescription: string
  ageRange: string
  level: string
  painPoints: string
  primaryGoal: string
}

const ONBOARDING_DEFAULTS: OnboardingState = {
  channelName: '',
  niche: '',
  customNiche: '',
  stage: '',
  incomeGoal: '',
  contentStyle: '',
  uploadFrequency: '',
  tone: '',
  customTone: '',
  audienceDescription: '',
  ageRange: '',
  level: '',
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

const INCOME_OPTIONS = [
  'First $100/month',
  '$1k/month',
  '$5k/month',
  '$10k/month',
  '$25k+/month',
  'Build a real media business',
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

const ONBOARDING_TOTAL_STEPS = 11

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
const LEGACY_ONBOARDING_KEY = 'scriptr:onboarding'
const LEGACY_SCRIPTS_KEY = 'scriptr:scripts'
const LEGACY_ONBOARDING_COMPLETE_KEY = 'scriptr:onboarding-complete'

const getUserStorageKey = (prefix: string, email?: string) => {
  const normalized = (email || 'guest').trim().toLowerCase()
  return `${prefix}:${encodeURIComponent(normalized)}`
}

const readLocalJson = <T,>(keys: string[]) => {
  for (const key of keys) {
    const value = localStorage.getItem(key)
    if (!value) {
      continue
    }

    try {
      return JSON.parse(value) as T
    } catch {
      continue
    }
  }

  return null
}

const parseIsoDate = (value: string | undefined) => {
  if (!value) {
    return null
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const normalizeSavedScript = (entry: Partial<SavedScript>): SavedScript => {
  const createdAt = entry.createdAt || new Date().toISOString()
  const createdDate = parseIsoDate(createdAt) || new Date()
  const title = entry.title || 'Untitled Script'
  const outlineSections = Array.isArray(entry.outlineSections) ? entry.outlineSections : []
  const fullScriptBody = entry.fullScriptBody || entry.script || 'No script content yet.'

  return {
    id: entry.id || `sc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

const buildPrimaryProfile = (onboarding: OnboardingState): ChannelProfile => ({
  id: 'cp-primary',
  channelName: onboarding.channelName || 'Untitled Channel',
  niche: getPrimaryNiche(onboarding),
  description: `Channel strategy for ${onboarding.channelName || 'your channel'} focused on ${
    getPrimaryNiche(onboarding)
  } content.`,
  audience: onboarding.audienceDescription || 'Audience profile not set yet.',
  tone: getPrimaryTone(onboarding),
  length: '8-12 minutes',
  ctaStyle: onboarding.primaryGoal || 'Subscriber CTA',
  frequency: onboarding.uploadFrequency || '1 video per month',
  monetizationGoal: onboarding.incomeGoal || 'Build sustainable channel revenue',
  pillars: onboarding.contentStyle || 'Educational explainers',
  inspirations: 'Add inspiration channels',
  brandVoice: getPrimaryTone(onboarding),
  isDefault: true,
})

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

function Home() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [activeNav, setActiveNav] = useState<NavKey>('dashboard')
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>(1)
  const [onboardingStep, setOnboardingStep] = useState(1)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [toast, setToast] = useState('')

  const [authUser, setAuthUser] = useState<{ name: string; email: string } | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [forgotEmail, setForgotEmail] = useState('')

  const [onboarding, setOnboarding] = useState<OnboardingState>(ONBOARDING_DEFAULTS)
  const [scripts, setScripts] = useState<SavedScript[]>(INITIAL_SCRIPTS)
  const [selectedScriptId, setSelectedScriptId] = useState('')
  const [scriptDetailView, setScriptDetailView] = useState<ScriptDetailView>('title')
  const [accountHydrated, setAccountHydrated] = useState(false)

  const [channelContext, setChannelContext] = useState<ChannelContext>({
    channelProfile: '',
    audience: '',
    audienceKnowledgeLevel: '',
    contentPillars: [],
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
    monetizationGoal: '',
    channelStage: '',
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
  const [generationError, setGenerationError] = useState('')
  const [retryAction, setRetryAction] = useState<null | (() => void)>(null)
  const [journeyFocused, setJourneyFocused] = useState(false)

  const primaryProfile = useMemo(() => buildPrimaryProfile(onboarding), [onboarding])
  const profiles = useMemo(() => [primaryProfile], [primaryProfile])
  const storageKeys = useMemo(
    () => ({
      onboarding: getUserStorageKey('scriptr:onboarding', authUser?.email),
      scripts: getUserStorageKey('scriptr:scripts', authUser?.email),
      onboardingComplete: getUserStorageKey('scriptr:onboarding-complete', authUser?.email),
    }),
    [authUser?.email],
  )
  const hydrateAccountData = (email?: string) => {
    const onboardingKey = getUserStorageKey('scriptr:onboarding', email)
    const scriptsKey = getUserStorageKey('scriptr:scripts', email)

    const storedOnboarding = readLocalJson<OnboardingState>(
      email ? [onboardingKey, LEGACY_ONBOARDING_KEY] : [onboardingKey],
    )
    if (storedOnboarding) {
      setOnboarding(storedOnboarding)
    } else {
      setOnboarding(ONBOARDING_DEFAULTS)
    }

    const storedScripts = readLocalJson<Array<Partial<SavedScript>>>(email ? [scriptsKey, LEGACY_SCRIPTS_KEY] : [scriptsKey])
    if (Array.isArray(storedScripts)) {
      const normalized = storedScripts.map((item) => normalizeSavedScript(item))
      setScripts(normalized)
      setSelectedScriptId(normalized[0]?.id || '')
      return
    }

    setScripts(INITIAL_SCRIPTS)
    setSelectedScriptId('')
  }

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const callback = await handleAuthCallback()
        if (callback?.user) {
          const userName =
            callback.user.userMetadata?.full_name ||
            callback.user.name ||
            callback.user.email?.split('@')[0] ||
            'Creator'
          setAuthUser({ name: userName, email: callback.user.email })
          hydrateAccountData(callback.user.email)
          setAccountHydrated(true)
          const done =
            localStorage.getItem(getUserStorageKey('scriptr:onboarding-complete', callback.user.email)) ||
            localStorage.getItem(LEGACY_ONBOARDING_COMPLETE_KEY)
          setScreen(done ? 'app' : 'onboarding')
          return
        }
      } catch {
        // Callback hash not present or invalid.
      }

      const user = await getUser()
      if (user) {
        const userName = user.userMetadata?.full_name || user.name || user.email?.split('@')[0] || 'Creator'
        setAuthUser({ name: userName, email: user.email })
        hydrateAccountData(user.email)
        setAccountHydrated(true)
        const done =
          localStorage.getItem(getUserStorageKey('scriptr:onboarding-complete', user.email)) ||
          localStorage.getItem(LEGACY_ONBOARDING_COMPLETE_KEY)
        setScreen(done ? 'app' : 'onboarding')
        return
      }

      setOnboarding(ONBOARDING_DEFAULTS)
      setScripts(INITIAL_SCRIPTS)
      setSelectedScriptId('')
      setAccountHydrated(false)
    }

    restoreSession()
  }, [])

  useEffect(() => {
    if (!authUser?.email || !accountHydrated) {
      return
    }
    localStorage.setItem(storageKeys.scripts, JSON.stringify(scripts))
  }, [accountHydrated, authUser?.email, scripts, storageKeys.scripts])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timeout = setTimeout(() => setToast(''), 2400)
    return () => clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    setChannelContext((value) => ({
      ...value,
      channelProfile: value.channelProfile || primaryProfile.description,
      niche: primaryProfile.niche,
      audience: value.audience || primaryProfile.audience,
      targetAudience: value.targetAudience || primaryProfile.audience,
      audienceKnowledgeLevel: value.audienceKnowledgeLevel || onboarding.level || '',
      tone: value.tone || primaryProfile.tone,
      monetizationGoal: value.monetizationGoal || primaryProfile.monetizationGoal,
      channelStage: value.channelStage || onboarding.stage,
      contentPillars:
        value.contentPillars && value.contentPillars.length
          ? value.contentPillars
          : primaryProfile.pillars
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
      exampleChannels:
        value.exampleChannels && value.exampleChannels.length
          ? value.exampleChannels
          : primaryProfile.inspirations
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
      userNotes: value.userNotes || onboarding.primaryGoal || '',
      audiencePainPoints: value.audiencePainPoints || onboarding.painPoints || '',
      channelStyle: value.channelStyle || value.videoFormat || primaryProfile.pillars,
      channelName: value.channelName || primaryProfile.channelName,
    }))
  }, [primaryProfile, onboarding.level, onboarding.painPoints, onboarding.primaryGoal, onboarding.stage])

  const selectedProfile = profiles[0]

  const selectedScript = useMemo(
    () => scripts.find((item) => item.id === selectedScriptId) || scripts[0],
    [scripts, selectedScriptId],
  )
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

  const openToast = (message: string) => {
    setToast(message)
  }

  const onAuthSubmit = async (mode: 'signin' | 'signup') => {
    if (!authForm.email || !authForm.password || (mode === 'signup' && !authForm.name)) {
      setAuthError('Complete all required fields before continuing.')
      return
    }

    setAuthLoading(true)
    setAuthError('')

    try {
      if (mode === 'signup') {
        const user = await signup(authForm.email, authForm.password, { full_name: authForm.name })
        const userName = user.userMetadata?.full_name || authForm.name || 'Creator'

        setAuthUser({ name: userName, email: user.email })
        hydrateAccountData(user.email)
        setAccountHydrated(true)
        setScreen('onboarding')
        openToast(
          user.emailVerified ? 'Account ready. Personalizing your workspace.' : 'Account created. Check email to confirm.',
        )
      } else {
        const user = await login(authForm.email, authForm.password)
        const userName = user.userMetadata?.full_name || user.name || user.email.split('@')[0] || 'Creator'

        setAuthUser({ name: userName, email: user.email })
        hydrateAccountData(user.email)
        setAccountHydrated(true)
        const done =
          localStorage.getItem(getUserStorageKey('scriptr:onboarding-complete', user.email)) ||
          localStorage.getItem(LEGACY_ONBOARDING_COMPLETE_KEY)
        setScreen(done ? 'app' : 'onboarding')
        openToast('Signed in. Welcome back to Scriptr.')
      }
    } catch (error) {
      if (error instanceof MissingIdentityError) {
        setAuthError('Netlify Identity is not configured in this environment yet.')
      } else if (error instanceof AuthError) {
        if (error.status === 401) {
          setAuthError('Invalid email or password.')
        } else if (error.status === 403) {
          setAuthError('Signups are currently disabled.')
        } else {
          setAuthError(error.message)
        }
      } else {
        setAuthError('Unable to complete authentication right now.')
      }
    } finally {
      setAuthLoading(false)
    }
  }

  const onLogout = async () => {
    try {
      await logout()
    } catch {
      // Ignore logout issues in demo environments.
    }

    setAuthUser(null)
    setAccountHydrated(false)
    setScreen('landing')
    setActiveNav('dashboard')
    openToast('Signed out.')
  }

  const persistOnboarding = (updated: OnboardingState) => {
    setOnboarding(updated)
    if (authUser?.email) {
      localStorage.setItem(storageKeys.onboarding, JSON.stringify(updated))
    }
  }

  const nextOnboarding = () => {
    if (onboardingStep === 3 && !onboarding.channelName.trim()) {
      openToast('Please enter your channel name to continue.')
      return
    }

    if (onboardingStep === ONBOARDING_TOTAL_STEPS) {
      if (authUser?.email) {
        localStorage.setItem(storageKeys.onboardingComplete, 'true')
      }
      setScreen('app')
      openToast('Workspace ready. Start building your channel system.')
      return
    }

    setOnboardingStep((value) => Math.min(ONBOARDING_TOTAL_STEPS, value + 1))
  }

  const previousOnboarding = () => {
    setOnboardingStep((value) => Math.max(1, value - 1))
  }

  const toggleFavoriteScript = (id: string) => {
    setScripts((current) =>
      current.map((script) => (script.id === id ? { ...script, favorite: !script.favorite } : script)),
    )
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

  const upsertSavedScript = (
    generated: GeneratedScript,
    options: { notify: boolean; fullScriptBody?: string; outlineSections?: Array<{ heading: string; content: string }> },
  ) => {
    const recordId = autosavedScriptId || `sc-${Date.now()}`

    setScripts((current) => {
      const nowIso = new Date().toISOString()
      const existing = autosavedScriptId ? current.find((script) => script.id === autosavedScriptId) : null
      const formattedBody = options.fullScriptBody || formatScriptText(generated)
      const finalOutlineSections =
        options.outlineSections ||
        outlineBlocks.map((section) => ({
          heading: section.section,
          content: section.content,
        }))

      const nextScript: SavedScript = {
        id: recordId,
        title: generated.script.title || `Untitled Script (${new Date().toLocaleDateString()})`,
        selectedTitle: selectedTitle || generated.script.title || 'Untitled Script',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso,
        profile: selectedProfile.channelName,
        niche: channelContext.niche,
        tone: channelContext.tone || primaryProfile.tone,
        type: channelContext.videoFormat,
        status: 'Draft',
        favorite: existing?.favorite || false,
        outlineSections: finalOutlineSections,
        fullScriptBody: formattedBody,
        script: formattedBody,
      }

      if (autosavedScriptId) {
        return current.map((script) => (script.id === autosavedScriptId ? { ...script, ...nextScript } : script))
      }

      return [nextScript, ...current]
    })

    setAutosavedScriptId(recordId)
    setSelectedScriptId(recordId)

    if (options.notify) {
      openToast('Script saved to scripts library.')
    }
  }

  const withGenerationState = async (
    message: string,
    retry: () => void,
    action: () => Promise<void>,
  ) => {
    setIsGenerating(true)
    setLoadingMessage(message)
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
    }
  }

  const generateIdeas = async () => {
    if (!channelContext.niche.trim() || !channelContext.targetAudience.trim() || !channelContext.videoTopicIdea.trim()) {
      openToast('Add niche, target audience, and video topic idea to generate ideas.')
      return
    }

    setJourneyFocused(true)
    await withGenerationState('Analyzing your niche and generating video ideas...', () => void generateIdeas(), async () => {
      const data = await requestIdeas(channelContext)
      setVideoIdeas(data.ideas)
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
      setWorkflowStep(3)
      openToast('Titles generated.')
    })
  }

  const chooseTitleAndBuildOutline = async (title: string) => {
    setSelectedTitle(title)
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
      upsertSavedScript(data, { notify: true })
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
        upsertSavedScript(scriptDraft, { notify: false, fullScriptBody: data.polished_script })
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

  const downloadPdf = () => {
    if (!scriptDraft) {
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      openToast('Pop-up blocked. Allow pop-ups to export PDF.')
      return
    }

    printWindow.document.write(`<pre>${getCurrentScriptText()}</pre>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    setWorkflowStep(7)
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

  if (screen === 'signin' || screen === 'signup' || screen === 'forgot') {
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
              <h1>{screen === 'signup' ? 'Create your workspace' : screen === 'forgot' ? 'Password recovery' : 'Welcome back'}</h1>
              <p>
                {screen === 'signup'
                  ? 'Sign up to personalize Scriptr for your YouTube growth goals.'
                  : screen === 'forgot'
                    ? 'Enter your email and receive account recovery instructions.'
                    : 'Sign in to continue building scripts and channel systems.'}
              </p>
            </div>

            {screen !== 'forgot' ? (
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
            ) : (
              <form
                className="auth-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!forgotEmail) {
                    setAuthError('Email is required.')
                    return
                  }
                  openToast('Recovery flow placeholder sent. Connect Identity recovery callback for production.')
                  setScreen('signin')
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
                {authError && <p className="error-text">{authError}</p>}
                <button type="submit" className="btn primary">
                  Send recovery link
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
                title="What are your income goals with YouTube?"
                subtitle="Set your target so generation outputs align with your monetization path."
                options={INCOME_OPTIONS}
                value={onboarding.incomeGoal}
                onSelect={(value) => persistOnboarding({ ...onboarding, incomeGoal: value })}
              />
            )}

            {onboardingStep === 6 && (
              <OnboardingChoiceStep
                title="What type of videos do you want to create?"
                subtitle="Choose the format mix Scriptr should optimize for first."
                options={CONTENT_OPTIONS}
                value={onboarding.contentStyle}
                onSelect={(value) => persistOnboarding({ ...onboarding, contentStyle: value })}
              />
            )}

            {onboardingStep === 7 && (
              <OnboardingChoiceStep
                title="How many videos do you want to post per month?"
                subtitle="Select your monthly posting cadence."
                options={FREQUENCY_OPTIONS}
                value={onboarding.uploadFrequency}
                onSelect={(value) => persistOnboarding({ ...onboarding, uploadFrequency: value })}
              />
            )}

            {onboardingStep === 8 && (
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

            {onboardingStep === 9 && (
              <OnboardingAudienceStep onboarding={onboarding} onChange={(value) => persistOnboarding(value)} />
            )}

            {onboardingStep === 10 && (
              <OnboardingChoiceStep
                title="What do you want Scriptr to help you do first?"
                subtitle="Your first dashboard actions will be personalized based on this goal."
                options={PRIMARY_GOALS}
                value={onboarding.primaryGoal}
                onSelect={(value) => persistOnboarding({ ...onboarding, primaryGoal: value })}
              />
            )}

            {onboardingStep === 11 && <OnboardingCompletionStep onboarding={onboarding} userName={authUser?.name || 'Creator'} />}
          </section>

          {onboardingStep > 1 && onboardingStep < ONBOARDING_TOTAL_STEPS && (
            <div className="onboarding-actions">
              <button className="btn secondary" onClick={previousOnboarding}>
                Previous
              </button>
              <button className="btn primary" onClick={nextOnboarding}>
                Next <ChevronRight className="icon-inline" />
              </button>
            </div>
          )}

          {onboardingStep === ONBOARDING_TOTAL_STEPS && (
            <div className="onboarding-actions">
              <button className="btn primary" onClick={nextOnboarding}>
                Enter Dashboard <ArrowRight className="icon-inline" />
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
            <section className="dashboard-page">
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
                <p>
                  <strong>Monetization Goal:</strong> {selectedProfile.monetizationGoal}
                </p>
                <button className="btn primary" onClick={() => setActiveNav('generate')}>
                  Open Generate Journey
                </button>
              </section>
            </section>
          )}

          {activeNav === 'generate' && (
            <section className="generate-page">
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
                        Monetization goal
                        <input
                          value={channelContext.monetizationGoal}
                          onChange={(event) =>
                            setChannelContext((value) => ({ ...value, monetizationGoal: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Channel stage
                        <input
                          value={channelContext.channelStage}
                          onChange={(event) =>
                            setChannelContext((value) => ({ ...value, channelStage: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Audience knowledge level
                        <input
                          value={channelContext.audienceKnowledgeLevel || ''}
                          onChange={(event) =>
                            setChannelContext((value) => ({ ...value, audienceKnowledgeLevel: event.target.value }))
                          }
                          placeholder="Beginner, intermediate, advanced"
                        />
                      </label>
                      <label>
                        Content pillars
                        <input
                          value={(channelContext.contentPillars || []).join(', ')}
                          onChange={(event) =>
                            setChannelContext((value) => ({
                              ...value,
                              contentPillars: event.target.value
                                .split(',')
                                .map((item) => item.trim())
                                .filter(Boolean),
                            }))
                          }
                          placeholder="Myths, case studies, analysis"
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
                    <div className="skeleton-stack">
                      <p>{loadingMessage || 'Generating...'}</p>
                      <div className="skeleton" />
                      <div className="skeleton" />
                      <div className="skeleton" />
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
                            {videoIdeas.map((idea, index) => (
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
                                <span className="tag">Click score: {idea.click_score}</span>
                              </article>
                            ))}
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
            <section className="scripts-page">
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

              <div className="content-grid two">
                <section className="panel glass-panel">
                  <h3>Script Cards</h3>
                  <div className="cards-list scrollable">
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
                </section>

                <section className="panel glass-panel">
                  <h3>Script Detail</h3>
                  {selectedScript ? (
                    <>
                      <h4>{selectedScript.title}</h4>
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
                        {scriptDetailView === 'title' && <p>{selectedScript.selectedTitle || selectedScript.title}</p>}
                        {scriptDetailView === 'outline' &&
                          (selectedScript.outlineSections.length ? (
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
                        {scriptDetailView === 'full' && <pre>{selectedScript.fullScriptBody || selectedScript.script}</pre>}
                      </div>
                      <div className="tag-row">
                        <span className="tag">{selectedScript.date}</span>
                        <span className="tag">{selectedScript.niche}</span>
                        <span className="tag">{selectedScript.status}</span>
                      </div>
                      <div className="action-row wrap">
                        <button className="btn secondary">Edit title</button>
                        <button className="btn secondary">Duplicate</button>
                        <button className="btn secondary">Export</button>
                        <button className="btn ghost">Delete</button>
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      title="No scripts yet"
                      text="Create your first script in the Generate workspace."
                      cta="Generate script"
                      onClick={() => setActiveNav('generate')}
                    />
                  )}
                </section>
              </div>
            </section>
          )}

          {activeNav === 'profiles' && (
            <section className="profiles-page">
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
                <p>
                  <strong>Monetization:</strong> {selectedProfile.monetizationGoal}
                </p>
                <p>
                  <strong>Content style:</strong> {selectedProfile.pillars}
                </p>
              </article>
            </section>
          )}

          {activeNav === 'usage' && (
            <section className="usage-page">
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
                <StatCard title="Plan usage" value="60%" meta="18 of 30 credits" />
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
                  <p>Most productive day: Wednesday</p>
                </section>
              </div>
            </section>
          )}

          {activeNav === 'billing' && (
            <section className="billing-page">
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
            <section className="settings-page">
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
          Audience level
          <select
            value={onboarding.level}
            onChange={(event) => onChange({ ...onboarding, level: event.target.value })}
          >
            <option value="">Select level</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
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
          <h4>Income Goal</h4>
          <p>{onboarding.incomeGoal || 'Not set'}</p>
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
