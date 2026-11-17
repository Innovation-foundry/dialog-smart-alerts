import { useState, useEffect, useCallback } from 'react'

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(null) // null = checking
  const [error, setError] = useState(null)

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const { authenticated } = await res.json()
      setAuthenticated(authenticated)
    } catch {
      setAuthenticated(false)
    }
  }, [])

  useEffect(() => { check() }, [check])

  const login = useCallback(async (username, password) => {
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || 'Login failed')
      }
      setAuthenticated(true)
      return true
    } catch (e) {
      setError(e.message)
      return false
    }
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setAuthenticated(false)
  }, [])

  return { authenticated, error, login, logout, recheck: check }
}
