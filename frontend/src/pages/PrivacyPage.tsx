import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { GlowCard } from '../components/ui/GlowCard'
import { usePageTitle } from '../hooks/usePageTitle'

export function PrivacyPage() {
  usePageTitle('Privacy Policy')

  return (
    <main className="min-h-screen bg-mesh px-4 py-12 text-text">
      <div className="mx-auto max-w-3xl">
        <GlowCard contentClassName="p-8">
          <h1 className="font-display text-3xl font-bold text-gradient">Privacy Policy</h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Last updated May 2026
          </p>
          <div className="mt-6 space-y-4 text-sm leading-7 text-text-secondary">
            <p>
              Flarq is committed to protecting your privacy. We use your account, resume,
              application, and job-description data only to provide the product features you request.
            </p>
            <p>
              Your data powers resume parsing, gap analysis, cover-letter generation, application
              tracking, analytics, and agent responses. We do not sell personal data.
            </p>
            <p>
              Production deployments should configure secure MongoDB Atlas access, Google Cloud
              service accounts, HTTPS-only frontend and backend URLs, and strong JWT secrets.
            </p>
          </div>
          <Link to="/">
            <Button className="mt-8">Back to Flarq</Button>
          </Link>
        </GlowCard>
      </div>
    </main>
  )
}
