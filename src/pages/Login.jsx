import { useState } from 'react'
import { Button, Field, Input, Card } from '../components/ui'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const ok = await onLogin(username, password)
    if (!ok) setError('Invalid username or password')
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-alt px-4">
      <Card className="w-full max-w-sm space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-ink">Dialog Smart Alerts</h1>
          <p className="text-sm text-ink-muted">Sign in to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Username">
            <Input
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" variant="primary" className="w-full" loading={submitting}>
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  )
}
