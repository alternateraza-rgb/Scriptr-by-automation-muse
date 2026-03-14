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
type GenTab = 'Overview' | 'Titles' | 'Hooks' | 'Outline' | 'Full Script' | 'CTA' | 'Repurpose'

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
  date: string
  profile: string
  niche: string
  type: string
  status: string
  favorite: boolean
  script: string
}

type OnboardingState = {
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
  '1 video/week',
  '2-3 videos/week',
  'Daily shorts',
  'Mixed schedule',
  'Not sure yet',
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
  'Create hooks and titles',
  'Build a full content system',
  'Save time for my team',
  'Launch my first channel',
]

const INITIAL_PROFILES: ChannelProfile[] = [
  {
    id: 'cp-1',
    channelName: 'Silent Signals AI',
    niche: 'AI tools',
    description: 'Faceless deep dives on AI products and workflows for operators.',
    audience: 'Founders and creators scaling with automation',
    tone: 'Authoritative + cinematic',
    length: '12-15 minutes',
    ctaStyle: 'Soft authority CTA to free toolkit',
    frequency: '2-3 videos/week',
    monetizationGoal: 'Leads for consulting + affiliates',
    pillars: 'AI tools, automations, workflow breakdowns',
    inspirations: 'ColdFusion, MagnatesMedia pacing',
    brandVoice: 'Confident, concise, strategic',
    isDefault: true,
  },
  {
    id: 'cp-2',
    channelName: 'Lux Ledger',
    niche: 'Luxury',
    description: 'Story-driven breakdowns of wealth, brands, and elite habits.',
    audience: 'Ambitious professionals 22-40',
    tone: 'Luxury documentary',
    length: '10-12 minutes',
    ctaStyle: 'Premium newsletter CTA',
    frequency: '1 video/week',
    monetizationGoal: 'Sponsorships + premium content',
    pillars: 'Luxury brands, status psychology, high-net-worth stories',
    inspirations: 'Vox style editing with premium voiceover',
    brandVoice: 'Elegant, sharp, editorial',
  },
]

const INITIAL_SCRIPTS: SavedScript[] = [
  {
    id: 'sc-1',
    title: '7 AI Automations Replacing Entry-Level Jobs in 2026',
    date: 'Mar 12, 2026',
    profile: 'Silent Signals AI',
    niche: 'AI tools',
    type: 'Long-form',
    status: 'Ready to record',
    favorite: true,
    script:
      'Hook: Most people think AI will replace jobs slowly. They are wrong.\n\nIntro: In the next 18 months, these seven automations will remove entire task categories...\n\nBody: [1] Sales ops automation... [2] Video repurposing pipelines... [3] Client reporting agents...\n\nCTA: Subscribe for weekly channel systems and plug into the Automation Muse playbook.',
  },
  {
    id: 'sc-2',
    title: 'How Luxury Brands Manufacture Desire (Without Lowering Prices)',
    date: 'Mar 10, 2026',
    profile: 'Lux Ledger',
    niche: 'Luxury',
    type: 'Documentary',
    status: 'Draft',
    favorite: false,
    script:
      'Hook: If quality alone sold products, luxury brands would not need waitlists.\n\nOutline: scarcity loops, symbolic value, controlled distribution, narrative engineering...\n\nCTA: Get the Luxury Channel Template in the description.',
  },
  {
    id: 'sc-3',
    title: 'The Hidden Math Behind Viral Finance Explainers',
    date: 'Mar 08, 2026',
    profile: 'Silent Signals AI',
    niche: 'Finance',
    type: 'Educational',
    status: 'In review',
    favorite: true,
    script:
      'Hook: Viral finance content is not random. It follows a pattern of contrast, conflict, and payoff...\n\nCTA: Save this script framework before your next upload sprint.',
  },
]

const GENERATION_TABS: GenTab[] = ['Overview', 'Titles', 'Hooks', 'Outline', 'Full Script', 'CTA', 'Repurpose']

const NAV_ITEMS: { key: NavKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'generate', label: 'Generate', icon: Sparkles },
  { key: 'scripts', label: 'Scripts', icon: FileText },
  { key: 'profiles', label: 'Channel Profiles', icon: BookOpen },
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
    a: 'Yes. From niche and topic inputs, Scriptr generates hooks, outlines, full scripts, titles, and repurpose outputs.',
  },
]

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
  const [activeTab, setActiveTab] = useState<GenTab>('Overview')
  const [onboardingStep, setOnboardingStep] = useState(1)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [toast, setToast] = useState('')

  const [authUser, setAuthUser] = useState<{ name: string; email: string } | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [forgotEmail, setForgotEmail] = useState('')

  const [onboarding, setOnboarding] = useState<OnboardingState>(ONBOARDING_DEFAULTS)
  const [profiles, setProfiles] = useState<ChannelProfile[]>(INITIAL_PROFILES)
  const [scripts, setScripts] = useState<SavedScript[]>(INITIAL_SCRIPTS)
  const [selectedScriptId, setSelectedScriptId] = useState(INITIAL_SCRIPTS[0]?.id ?? '')

  const [generatorForm, setGeneratorForm] = useState({
    profileId: INITIAL_PROFILES[0].id,
    niche: 'AI tools',
    videoTopic: 'AI workflows that replace manual agency tasks',
    audience: 'Agency founders scaling client delivery',
    videoType: 'Long-form faceless videos',
    videoLength: '10-12 minutes',
    tone: 'Authoritative',
    hookStyle: 'Curiosity hook',
    ctaGoal: 'Drive traffic to free automation toolkit',
    sourceNotes: 'Focus on practical systems with specific examples and metrics.',
    competitorInspiration: 'Think MagnatesMedia pacing with practical utility.',
    outputStyle: 'High-retention narrative',
    customInstructions: 'Use pattern interrupts every 45-60 seconds.',
  })

  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    const restoreSession = async () => {
      const storedOnboarding = localStorage.getItem('scriptr:onboarding')
      const done = localStorage.getItem('scriptr:onboarding-complete')

      if (storedOnboarding) {
        try {
          const parsed = JSON.parse(storedOnboarding) as OnboardingState
          setOnboarding(parsed)
        } catch {
          localStorage.removeItem('scriptr:onboarding')
        }
      }

      try {
        const callback = await handleAuthCallback()
        if (callback?.user) {
          const userName =
            callback.user.userMetadata?.full_name ||
            callback.user.name ||
            callback.user.email?.split('@')[0] ||
            'Creator'
          setAuthUser({ name: userName, email: callback.user.email })
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
        setScreen(done ? 'app' : 'onboarding')
      }
    }

    restoreSession()
  }, [])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timeout = setTimeout(() => setToast(''), 2400)
    return () => clearTimeout(timeout)
  }, [toast])

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === generatorForm.profileId) || profiles[0],
    [profiles, generatorForm.profileId],
  )

  const selectedScript = useMemo(
    () => scripts.find((item) => item.id === selectedScriptId) || scripts[0],
    [scripts, selectedScriptId],
  )

  const recommendation = useMemo(() => {
    if (!onboarding.primaryGoal) {
      return 'Start with Generate New Script to establish your first weekly content system.'
    }

    if (onboarding.primaryGoal === 'Create hooks and titles') {
      return 'Open Hook Generator and Title + Thumbnail tabs to build your first packaging sprint.'
    }

    if (onboarding.primaryGoal === 'Launch my first channel') {
      return 'Create your first channel profile, then generate 10 topics and one flagship script today.'
    }

    return 'Create a topic cluster and generate one full script to kick off your next upload cycle.'
  }, [onboarding.primaryGoal])

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
        setScreen('onboarding')
        openToast(
          user.emailVerified ? 'Account ready. Personalizing your workspace.' : 'Account created. Check email to confirm.',
        )
      } else {
        const user = await login(authForm.email, authForm.password)
        const userName = user.userMetadata?.full_name || user.name || user.email.split('@')[0] || 'Creator'

        setAuthUser({ name: userName, email: user.email })
        const done = localStorage.getItem('scriptr:onboarding-complete')
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
    setScreen('landing')
    setActiveNav('dashboard')
    openToast('Signed out.')
  }

  const persistOnboarding = (updated: OnboardingState) => {
    setOnboarding(updated)
    localStorage.setItem('scriptr:onboarding', JSON.stringify(updated))
  }

  const nextOnboarding = () => {
    if (onboardingStep === 10) {
      localStorage.setItem('scriptr:onboarding-complete', 'true')
      setScreen('app')
      openToast('Workspace ready. Start building your channel system.')
      return
    }

    setOnboardingStep((value) => Math.min(10, value + 1))
  }

  const previousOnboarding = () => {
    setOnboardingStep((value) => Math.max(1, value - 1))
  }

  const triggerGeneration = (message: string) => {
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      openToast(message)
    }, 900)
  }

  const addProfile = () => {
    const newProfile: ChannelProfile = {
      id: `cp-${Date.now()}`,
      channelName: 'New Channel Profile',
      niche: onboarding.niche || 'AI',
      description: 'Describe this channel strategy and editorial direction.',
      audience: onboarding.audienceDescription || 'Ambitious creators',
      tone: onboarding.tone || 'Cinematic',
      length: '8-10 minutes',
      ctaStyle: 'Soft authority CTA',
      frequency: onboarding.uploadFrequency || '2-3 videos/week',
      monetizationGoal: onboarding.incomeGoal || 'Build a real media business',
      pillars: 'Pillar 1, Pillar 2, Pillar 3',
      inspirations: 'Add inspiration channels',
      brandVoice: 'Clear, strategic, high-retention',
    }

    setProfiles((current) => [newProfile, ...current])
    openToast('New channel profile created.')
  }

  const toggleFavoriteScript = (id: string) => {
    setScripts((current) =>
      current.map((script) => (script.id === id ? { ...script, favorite: !script.favorite } : script)),
    )
  }

  const saveNewScript = () => {
    const newScript: SavedScript = {
      id: `sc-${Date.now()}`,
      title: `${generatorForm.videoTopic} (${new Date().toLocaleDateString()})`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      profile: selectedProfile.channelName,
      niche: generatorForm.niche,
      type: generatorForm.videoType,
      status: 'Draft',
      favorite: false,
      script:
        'Hook: Viewers think this topic is saturated. This angle proves the opposite.\n\nIntro: Today we break down the exact playbook...\n\nCTA: Subscribe for the next workflow breakdown.',
    }

    setScripts((current) => [newScript, ...current])
    setSelectedScriptId(newScript.id)
    setActiveNav('scripts')
    openToast('Script saved to your library.')
  }

  const scriptCount = scripts.length
  const monthlyOutput = 18
  const monthlyLimit = 60

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
              Scriptr helps creators turn channel ideas into hooks, titles, outlines, and high-retention scripts built to
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
              <p>Create complete script structures with hooks, story beats, and CTA placements.</p>
            </article>
            <article className="feature-card glass-panel">
              <Target className="card-icon" />
              <h3>Packaging systems</h3>
              <p>Generate titles, thumbnails, and hooks in a single guided production flow.</p>
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
              Use structured AI workflows to create ideas, hooks, scripts, and packaging assets that convert viewers into
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
    const progress = (onboardingStep / 10) * 100

    return (
      <main className="onboarding-page">
        <div className="onboarding-shell glass-panel">
          <div className="onboarding-head">
            <ScriptrLogo />
            <span className="chip">Step {onboardingStep} of 10</span>
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
              <OnboardingChoiceStep
                title="Where are you in your YouTube journey?"
                subtitle="Scriptr adapts recommendations to your current stage."
                options={STAGE_OPTIONS}
                value={onboarding.stage}
                onSelect={(value) => persistOnboarding({ ...onboarding, stage: value })}
              />
            )}

            {onboardingStep === 4 && (
              <OnboardingChoiceStep
                title="What are your income goals with YouTube?"
                subtitle="Set your target so generation outputs align with your monetization path."
                options={INCOME_OPTIONS}
                value={onboarding.incomeGoal}
                onSelect={(value) => persistOnboarding({ ...onboarding, incomeGoal: value })}
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
                title="How often do you want to publish?"
                subtitle="Cadence affects your content system, script depth, and production planning."
                options={FREQUENCY_OPTIONS}
                value={onboarding.uploadFrequency}
                onSelect={(value) => persistOnboarding({ ...onboarding, uploadFrequency: value })}
              />
            )}

            {onboardingStep === 7 && (
              <OnboardingChoiceStep
                title="What tone should your scripts have?"
                subtitle="Choose your default brand voice for generated scripts and hooks."
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

          {onboardingStep > 1 && onboardingStep < 10 && (
            <div className="onboarding-actions">
              <button className="btn secondary" onClick={previousOnboarding}>
                Previous
              </button>
              <button className="btn primary" onClick={nextOnboarding}>
                Next <ChevronRight className="icon-inline" />
              </button>
            </div>
          )}

          {onboardingStep === 10 && (
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
                <p>
                  Running a {onboarding.niche || 'faceless'} channel with goal of{' '}
                  <strong>{onboarding.incomeGoal || 'scalable monthly revenue'}</strong>.
                </p>
              </header>

              <div className="quick-actions">
                <button className="btn primary" onClick={() => setActiveNav('generate')}>
                  Generate New Script
                </button>
                <button
                  className="btn secondary"
                  onClick={() => {
                    setActiveTab('Hooks')
                    setActiveNav('generate')
                  }}
                >
                  Generate Hooks
                </button>
                <button className="btn secondary" onClick={() => setActiveNav('scripts')}>
                  Your Saved Scripts
                </button>
              </div>

              <div className="stat-grid">
                <StatCard title="This Month's Output" value={`${monthlyOutput}`} meta="Scripts generated" />
                <StatCard title="Plan Usage" value={`${monthlyOutput}/${monthlyLimit}`} meta="Starter plan usage" />
                <StatCard title="Saved Scripts" value={`${scriptCount}`} meta="Library assets" />
                <StatCard title="Primary Goal" value={onboarding.primaryGoal || 'Launch growth'} meta="Personalized focus" />
              </div>

              <div className="content-grid two">
                <section className="panel glass-panel">
                  <h3>Recent Generations</h3>
                  <ul className="simple-list">
                    <li>
                      <span>AI workflow documentary script</span>
                      <small>2 hours ago</small>
                    </li>
                    <li>
                      <span>10 title options for luxury case study</span>
                      <small>Yesterday</small>
                    </li>
                    <li>
                      <span>Hook rewrite in documentary tone</span>
                      <small>2 days ago</small>
                    </li>
                  </ul>
                </section>

                <section className="panel glass-panel">
                  <h3>Recommended Next Action</h3>
                  <p>{recommendation}</p>
                  <button className="btn ghost" onClick={() => setActiveNav('generate')}>
                    Continue workflow
                  </button>
                </section>
              </div>

              <div className="content-grid two">
                <section className="panel glass-panel">
                  <h3>Channel Profile Summary</h3>
                  <p>
                    <strong>{profiles[0].channelName}</strong>
                  </p>
                  <p>{profiles[0].description}</p>
                  <div className="tag-row">
                    <span className="tag">{profiles[0].niche}</span>
                    <span className="tag">{profiles[0].tone}</span>
                    <span className="tag">{profiles[0].frequency}</span>
                  </div>
                </section>

                <section className="panel glass-panel">
                  <h3>Empty State: Recent Scripts</h3>
                  <p>No new scripts generated today. Start with a topic cluster and create your next upload batch.</p>
                  <button className="btn primary" onClick={() => setActiveNav('generate')}>
                    Start generating
                  </button>
                </section>
              </div>
            </section>
          )}

          {activeNav === 'generate' && (
            <section className="generate-page">
              <header className="page-header">
                <h1>Script Generation Workflow</h1>
                <p>Structured creation flow for topics, hooks, outlines, scripts, and repurpose outputs.</p>
              </header>

              <div className="generation-layout">
                <section className="panel glass-panel">
                  <h3>Topic Input</h3>
                  <div className="form-grid">
                    <label>
                      Channel profile
                      <select
                        value={generatorForm.profileId}
                        onChange={(event) =>
                          setGeneratorForm((value) => ({ ...value, profileId: event.target.value }))
                        }
                      >
                        {profiles.map((profile) => (
                          <option value={profile.id} key={profile.id}>
                            {profile.channelName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Niche
                      <input
                        value={generatorForm.niche}
                        onChange={(event) =>
                          setGeneratorForm((value) => ({ ...value, niche: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Video topic
                      <input
                        value={generatorForm.videoTopic}
                        onChange={(event) =>
                          setGeneratorForm((value) => ({ ...value, videoTopic: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Target audience
                      <input
                        value={generatorForm.audience}
                        onChange={(event) =>
                          setGeneratorForm((value) => ({ ...value, audience: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Video type
                      <input
                        value={generatorForm.videoType}
                        onChange={(event) =>
                          setGeneratorForm((value) => ({ ...value, videoType: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Desired length
                      <input
                        value={generatorForm.videoLength}
                        onChange={(event) =>
                          setGeneratorForm((value) => ({ ...value, videoLength: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Tone
                      <input
                        value={generatorForm.tone}
                        onChange={(event) =>
                          setGeneratorForm((value) => ({ ...value, tone: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Hook style
                      <input
                        value={generatorForm.hookStyle}
                        onChange={(event) =>
                          setGeneratorForm((value) => ({ ...value, hookStyle: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      CTA goal
                      <input
                        value={generatorForm.ctaGoal}
                        onChange={(event) =>
                          setGeneratorForm((value) => ({ ...value, ctaGoal: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Source notes
                      <textarea
                        value={generatorForm.sourceNotes}
                        onChange={(event) =>
                          setGeneratorForm((value) => ({ ...value, sourceNotes: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Competitor inspiration
                      <textarea
                        value={generatorForm.competitorInspiration}
                        onChange={(event) =>
                          setGeneratorForm((value) => ({ ...value, competitorInspiration: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Output style
                      <input
                        value={generatorForm.outputStyle}
                        onChange={(event) =>
                          setGeneratorForm((value) => ({ ...value, outputStyle: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Custom instructions
                      <textarea
                        value={generatorForm.customInstructions}
                        onChange={(event) =>
                          setGeneratorForm((value) => ({ ...value, customInstructions: event.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <div className="action-row">
                    <button className="btn secondary" onClick={() => triggerGeneration('Topic ideas generated.') }>
                      Generate Ideas
                    </button>
                    <button className="btn secondary" onClick={() => triggerGeneration('Outline generated.') }>
                      Build Outline
                    </button>
                    <button className="btn primary" onClick={() => triggerGeneration('Full script generated.') }>
                      Write Full Script
                    </button>
                  </div>
                </section>

                <section className="panel glass-panel">
                  <div className="tabs-row">
                    {GENERATION_TABS.map((tab) => (
                      <button
                        key={tab}
                        className={`tab-pill ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {isGenerating ? (
                    <div className="skeleton-stack">
                      <div className="skeleton" />
                      <div className="skeleton" />
                      <div className="skeleton" />
                    </div>
                  ) : (
                    <>
                      {activeTab === 'Overview' && (
                        <div className="content-stack">
                          <h3>Topic + Angle Results</h3>
                          <div className="card-grid">
                            <article className="result-card">
                              <h4>Topic Idea</h4>
                              <p>Why agency owners are replacing coordinators with AI copilots.</p>
                              <span className="tag">Click potential: 9/10</span>
                            </article>
                            <article className="result-card">
                              <h4>Angle Idea</h4>
                              <p>The hidden profit leak fixed by simple content automation workflows.</p>
                              <span className="tag">High curiosity</span>
                            </article>
                            <article className="result-card">
                              <h4>Thumbnail text</h4>
                              <p>"AGENCY TASKS DEAD"</p>
                              <span className="tag">Authority style</span>
                            </article>
                          </div>
                        </div>
                      )}

                      {activeTab === 'Titles' && (
                        <div className="content-stack">
                          <h3>Title + Thumbnail Generator</h3>
                          <ul className="cards-list">
                            <li>
                              <span>10 AI Workflows Replacing Agency Roles in 2026</span>
                              <em>Viral</em>
                            </li>
                            <li>
                              <span>Agency Owners: Stop Hiring Before You Build This System</span>
                              <em>Authority</em>
                            </li>
                            <li>
                              <span>The AI Stack That Doubled Content Output Without New Staff</span>
                              <em>Clean</em>
                            </li>
                          </ul>
                        </div>
                      )}

                      {activeTab === 'Hooks' && (
                        <div className="content-stack">
                          <h3>Hook Generator</h3>
                          <div className="card-grid">
                            <article className="result-card">
                              <h4>Curiosity hook</h4>
                              <p>Most creators fail because they optimize editing instead of scripting systems.</p>
                            </article>
                            <article className="result-card">
                              <h4>Shock hook</h4>
                              <p>One workflow made our worst video writer the most profitable content operator.</p>
                            </article>
                            <article className="result-card">
                              <h4>Authority hook</h4>
                              <p>After 200 scripts, this structure consistently kept retention above 42%.</p>
                            </article>
                          </div>
                        </div>
                      )}

                      {activeTab === 'Outline' && (
                        <div className="content-stack">
                          <h3>Outline Builder</h3>
                          <ul className="step-list">
                            <li>
                              <strong>Hook:</strong> expose the hidden cost of manual workflows.
                              <div className="mini-actions">
                                <button className="btn tiny">Regenerate</button>
                                <button className="btn tiny">Lock</button>
                              </div>
                            </li>
                            <li>
                              <strong>Intro:</strong> frame the opportunity and quick win timeline.
                            </li>
                            <li>
                              <strong>Main sections:</strong> system diagnosis, workflow architecture, implementation plan.
                            </li>
                            <li>
                              <strong>CTA placement:</strong> include free toolkit lead magnet after proof section.
                            </li>
                          </ul>
                        </div>
                      )}

                      {activeTab === 'Full Script' && (
                        <div className="content-stack">
                          <h3>Full Script Output</h3>
                          <article className="script-panel">
                            <h4>Title</h4>
                            <p>The AI Workflow Playbook Every Agency Will Need in 2026</p>
                            <h4>Thumbnail Text</h4>
                            <p>"THIS REPLACED 3 ROLES"</p>
                            <h4>Hook</h4>
                            <p>
                              Most agency owners are hiring for a problem that a 3-step workflow can eliminate this week.
                            </p>
                            <h4>Body</h4>
                            <p>
                              Section 1: expose the bottleneck. Section 2: map the automation stack. Section 3: execution
                              roadmap for next 30 days.
                            </p>
                            <h4>CTA</h4>
                            <p>Download the Automation Muse scripting template in the description.</p>
                          </article>

                          <div className="action-row wrap">
                            <button className="btn secondary" onClick={saveNewScript}>
                              Save script
                            </button>
                            <button className="btn secondary" onClick={() => openToast('Copied to clipboard placeholder.') }>
                              Copy
                            </button>
                            <button className="btn secondary" onClick={() => openToast('Export placeholder created.') }>
                              Export
                            </button>
                            <button className="btn ghost" onClick={() => openToast('Applied dramatic rewrite preset.') }>
                              More dramatic
                            </button>
                            <button className="btn ghost" onClick={() => openToast('Applied educational rewrite preset.') }>
                              More educational
                            </button>
                            <button className="btn ghost" onClick={() => openToast('Repurposed for shorts.') }>
                              Rewrite for shorts
                            </button>
                          </div>
                        </div>
                      )}

                      {activeTab === 'CTA' && (
                        <div className="content-stack">
                          <h3>CTA Suggestions</h3>
                          <div className="card-grid">
                            <article className="result-card">
                              <h4>Lead magnet CTA</h4>
                              <p>Download the free channel operating system and deploy this in your next upload sprint.</p>
                            </article>
                            <article className="result-card">
                              <h4>Community CTA</h4>
                              <p>Join the Automation Muse creator circle for weekly frameworks and teardown sessions.</p>
                            </article>
                          </div>
                        </div>
                      )}

                      {activeTab === 'Repurpose' && (
                        <div className="content-stack">
                          <h3>Repurpose Tools</h3>
                          <ul className="simple-list">
                            <li>
                              <span>Convert long-form script into 7 Shorts</span>
                              <button className="btn tiny">Run</button>
                            </li>
                            <li>
                              <span>Generate intro-only version</span>
                              <button className="btn tiny">Run</button>
                            </li>
                            <li>
                              <span>Create social caption sequence</span>
                              <button className="btn tiny">Run</button>
                            </li>
                            <li>
                              <span>Rewrite for beginner audience</span>
                              <button className="btn tiny">Run</button>
                            </li>
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </section>
              </div>
            </section>
          )}

          {activeNav === 'scripts' && (
            <section className="scripts-page">
              <header className="page-header">
                <h1>Saved Scripts Library</h1>
                <p>Search, filter, and manage scripts across channel profiles.</p>
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
                        onClick={() => setSelectedScriptId(script.id)}
                      >
                        <h4>{script.title}</h4>
                        <p>{script.date}</p>
                        <div className="tag-row">
                          <span className="tag">{script.profile}</span>
                          <span className="tag">{script.type}</span>
                          <span className="tag">{script.status}</span>
                        </div>
                        <div className="mini-actions">
                          <button className="btn tiny" onClick={() => toggleFavoriteScript(script.id)}>
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
                      <p>{selectedScript.script}</p>
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
                <h1>Channel Profile Management</h1>
                <p>Create, edit, and set default profiles for each niche or channel operation.</p>
              </header>

              <div className="action-row">
                <button className="btn primary" onClick={addProfile}>
                  Create profile
                </button>
              </div>

              {profiles.length ? (
                <div className="card-grid three">
                  {profiles.map((profile) => (
                    <article className="panel glass-panel" key={profile.id}>
                      <h3>{profile.channelName}</h3>
                      <p>{profile.description}</p>
                      <div className="tag-row">
                        <span className="tag">{profile.niche}</span>
                        <span className="tag">{profile.tone}</span>
                        <span className="tag">{profile.frequency}</span>
                      </div>
                      <p>
                        <strong>Audience:</strong> {profile.audience}
                      </p>
                      <p>
                        <strong>Monetization:</strong> {profile.monetizationGoal}
                      </p>
                      <div className="mini-actions">
                        <button className="btn tiny">Edit</button>
                        <button className="btn tiny">Use in generation</button>
                        <button className="btn tiny">Set default</button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No channel profile yet"
                  text="Create a profile to personalize script outputs and speed up generation."
                  cta="Create profile"
                  onClick={addProfile}
                />
              )}
            </section>
          )}

          {activeNav === 'usage' && (
            <section className="usage-page">
              <header className="page-header">
                <h1>Analytics & Usage</h1>
                <p>Track script output, style distribution, and plan utilization.</p>
              </header>

              <div className="stat-grid">
                <StatCard title="Scripts this month" value="18" meta="+22% vs last month" />
                <StatCard title="Favorite niche" value="AI tools" meta="42% of generations" />
                <StatCard title="Most-used tone" value="Authoritative" meta="31 generations" />
                <StatCard title="Plan usage" value="60%" meta="18 of 30 credits" />
              </div>

              <div className="content-grid two">
                <section className="panel glass-panel">
                  <h3>Recent activity</h3>
                  <ul className="simple-list">
                    <li>
                      <span>Generated 10 title options for finance upload</span>
                      <small>Today</small>
                    </li>
                    <li>
                      <span>Saved documentary-style script revision</span>
                      <small>Yesterday</small>
                    </li>
                    <li>
                      <span>Created channel profile: Luxe Case Files</span>
                      <small>2 days ago</small>
                    </li>
                  </ul>
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
          <h4>Niche</h4>
          <p>{onboarding.customNiche || onboarding.niche || 'Not set'}</p>
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
