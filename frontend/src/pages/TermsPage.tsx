import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { GlowCard } from '../components/ui/GlowCard'
import { usePageTitle } from '../hooks/usePageTitle'

export function TermsPage() {
  usePageTitle('Terms of Service')

  return (
    <main className="min-h-screen bg-mesh px-4 py-12 text-text">
      <div className="mx-auto max-w-3xl">
        <GlowCard contentClassName="p-8">
          <h1 className="font-display text-3xl font-bold text-gradient">Terms of Service</h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Last updated May 2026
          </p>
          <div className="mt-6 space-y-4 text-sm leading-7 text-text-secondary">
            <p>
              Flarq helps organize and improve your job search. AI-generated analysis, letters,
              and recommendations should be reviewed by you before sending to employers.
            </p>
            <p>
              You are responsible for the accuracy of profile information, applications, and any
              communication you send. Flarq does not guarantee interviews, offers, or employment.
            </p>
            <p>
              Use the service lawfully and avoid uploading content you do not have permission to
              process.
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
