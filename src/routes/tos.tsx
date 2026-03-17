import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tos')({
  component: TermsPage,
})

function TermsPage() {
  return (
    <main className="marketing-page">
      <section className="tos-sheet glass-panel reveal-up">
        <h1>Terms and Conditions</h1>
        <p>Effective date: March 16, 2026</p>

        <h2>1. Service Access</h2>
        <p>
          Scriptr provides AI-powered tools to support script development and planning workflows. Access may be
          updated, limited, or suspended for maintenance, security, or policy enforcement.
        </p>

        <h2>2. Accounts and Billing</h2>
        <p>
          Users are responsible for account security and payment accuracy. Credits are consumed when generation
          requests are processed. Plan limits and included features are defined by the active subscription.
        </p>

        <h2>3. Acceptable Use</h2>
        <p>
          Users may not submit unlawful, abusive, or rights-infringing content. Attempts to reverse engineer, abuse,
          or disrupt service operations are prohibited.
        </p>

        <h2>4. Content Responsibility</h2>
        <p>
          Users retain responsibility for reviewing and validating generated outputs before publication. Scriptr does
          not guarantee specific performance outcomes from generated scripts.
        </p>

        <h2>5. Changes to Terms</h2>
        <p>
          Terms may be revised to reflect product or legal updates. Continued use after an update constitutes
          acceptance of the latest version.
        </p>

        <h2>6. Privacy Policy</h2>
        <p>
          Scriptr collects and processes account details, billing metadata, and service usage data to operate,
          secure, and improve the platform. Personal data is handled in accordance with applicable privacy laws and
          is not sold to third parties.
        </p>

        <h2>7. Refund Policy</h2>
        <p>
          Subscription charges are generally non-refundable once a billing cycle begins and credits are made
          available. Refund requests related to duplicate charges, billing errors, or service disruptions may be
          reviewed case by case by the support team.
        </p>

        <h2>8. Contact</h2>
        <p>For legal or policy questions, contact the Scriptr support team through official account channels.</p>
      </section>
    </main>
  )
}
