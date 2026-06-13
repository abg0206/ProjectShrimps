import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  async function handleLogin() {
    setError('')

    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed. Please try again.')
        return
      }

      // Store user info for the session
      sessionStorage.setItem('user', JSON.stringify({ email: data.email, clerkId: data.clerkId }))

      navigate('/dashboard')
    } catch (err) {
      setError('Could not connect to the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div style={{ backgroundColor: '#D9958C', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

      <h1 style={{ color: '#3C1510', fontSize: '32px', fontWeight: 'bold', marginBottom: '24px' }}>
        Shrimply
      </h1>

      <div style={{ backgroundColor: '#E6CECB', padding: '32px', borderRadius: '12px', width: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ padding: '10px', borderRadius: '6px', border: 'none', fontSize: '14px' }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ padding: '10px', borderRadius: '6px', border: 'none', fontSize: '14px' }}
        />

        {error && (
          <p style={{ color: '#932C20', fontSize: '13px', margin: 0, textAlign: 'center' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            backgroundColor: loading ? '#c0847a' : '#E26050',
            color: 'white',
            padding: '10px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Signing in...' : 'Login'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#3C1510' }}>
          Don't have an account? <a href="/register" style={{ color: '#932C20' }}>Create one here</a>
        </p>

        <p style={{ textAlign: 'center', fontSize: '13px' }}>
          <a href="/forgot-password" style={{ color: '#932C20' }}>Forgot Password?</a>
        </p>

      </div>
    </div>
  )
}
