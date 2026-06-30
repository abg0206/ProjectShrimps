import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleRegister() {
    if (!email || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          clerk_id:
            'local-' + Date.now() + '-' + Math.random().toString(36).slice(2),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        return;
      }

      navigate('/');
    } catch  {
      setError('Could not connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleRegister();
  }

  return (
    <div
      style={{
        backgroundColor: '#D9958C',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <h1
        style={{
          color: '#3C1510',
          fontSize: '32px',
          fontWeight: 'bold',
          marginBottom: '24px',
        }}
      >
        Shrimply
      </h1>
      <div
        style={{
          backgroundColor: '#E6CECB',
          padding: '32px',
          borderRadius: '12px',
          width: '380px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <h2
          style={{
            color: '#3C1510',
            fontSize: '20px',
            fontWeight: 'bold',
            margin: 0,
            textAlign: 'center',
          }}
        >
          Create an account
        </h2>
        {error && (
          <p
            style={{
              color: '#932C20',
              fontSize: '13px',
              margin: 0,
              textAlign: 'center',
            }}
          >
            {error}
          </p>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            padding: '10px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '14px',
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            padding: '10px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '14px',
          }}
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            padding: '10px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '14px',
          }}
        />
        <button
          onClick={handleRegister}
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
          {loading ? 'Creating account...' : 'Register'}
        </button>
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#3C1510' }}>
          Already have an account?{' '}
          <a href="/" style={{ color: '#932C20' }}>
            Login here
          </a>
        </p>
      </div>
    </div>
  );
}
