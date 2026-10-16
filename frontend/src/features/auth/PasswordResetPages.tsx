import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { forgotPassword, resetPassword } from '@/api/auth'
import { apiError } from '@/lib/apiError'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AlertCircle, CheckCircle2, Mail, KeyRound } from 'lucide-react'

function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-center text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        <p className="mt-1 text-center text-xs text-gray-500">{subtitle}</p>
        <div className="mt-6 bg-white py-8 px-6 shadow-sm rounded-xl border border-gray-200/80 sm:px-10">{children}</div>
        <p className="mt-4 text-center text-xs">
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  )
}

function Notice({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  const styles = tone === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
  const Icon = tone === 'error' ? AlertCircle : CheckCircle2
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`mb-5 p-3 rounded-lg border text-xs flex items-start gap-2 font-medium ${styles}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      setSent((await forgotPassword(email.trim())).message)
    } catch (err) {
      setError(apiError(err).errors?.email?.[0] ?? apiError(err).message ?? 'Could not send the link. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Forgot password" subtitle="We'll email you a link to set a new password">
      {sent ? (
        <Notice tone="success">{sent}</Notice>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Notice tone="error">{error}</Notice>}
          <Input
            label="Email address"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" size="lg" className="w-full" isLoading={busy} icon={<Mail className="w-4 h-4" />}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  )
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('The two passwords do not match.')
    setBusy(true)
    try {
      setDone((await resetPassword({ token, email, password, password_confirmation: confirm })).message)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      const info = apiError(err)
      setError(info.errors?.email?.[0] ?? info.errors?.password?.[0] ?? info.message ?? 'Could not reset the password.')
    } finally {
      setBusy(false)
    }
  }

  if (!token || !email) {
    return (
      <AuthCard title="Reset password" subtitle="This link is incomplete">
        <Notice tone="error">Open the link from your email again, or ask for a new one.</Notice>
        <Link to="/forgot-password" className="text-xs font-medium text-indigo-600">Ask for a new link</Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Set a new password" subtitle={email}>
      {done ? (
        <Notice tone="success">{done}</Notice>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Notice tone="error">{error}</Notice>}
          <Input label="New password" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} helperText="At least 8 characters" />
          <Input label="Repeat new password" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <Button type="submit" size="lg" className="w-full" isLoading={busy} icon={<KeyRound className="w-4 h-4" />}>
            Save new password
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
