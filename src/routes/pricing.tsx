import { Link, createFileRoute } from '@tanstack/react-router'

const starterFeatures = [
  '3,000 monthly credits',
  'Scriptr AI agent included',
  'Smart hook generation',
  'SEO-ready title suggestions',
  'Creator workflow templates',
]

const growthFeatures = [
  '10,000 monthly credits',
  'Scriptr AI included',
  'Premium features unlocked',
  'Enhanced support',
  'Priority generation queue',
]

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
})

function PricingPage() {
  return (
    <main className="marketing-page">
      <header className="marketing-nav glass-panel">
        <Link to="/" className="brand-lockup brand-link">
          <span className="brand-marketing">Scriptr</span>
        </Link>
        <Link to="/" className="btn primary">
          Get Started
        </Link>
      </header>

      <section className="pricing-hero glass-panel reveal-up">
        <span className="chip">Simple pricing</span>
        <h1>Pick a plan and start generating faster.</h1>
        <p>Clean monthly pricing built for creators scaling scripted content with AI support.</p>
      </section>

      <section className="pricing-standalone-grid">
        <article className="pricing-standalone-card glass-panel">
          <h2>Starter</h2>
          <p className="pricing-amount">$1599</p>
          <ul>
            {starterFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </article>

        <article className="pricing-standalone-card glass-panel featured">
          <h2>Growth</h2>
          <p className="pricing-amount">$4800</p>
          <ul>
            {growthFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  )
}
