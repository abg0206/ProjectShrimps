import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  
  const [password, setPassword] = useState('')
  
  const navigate = useNavigate()

  function handleLogin() {
    localStorage.setItem('isLoggedIn', 'true')
    navigate('/dashboard')
  
  }

  return (
  
  <div style={{ backgroundColor: '#D9958C', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* App name , but he can change this */}
  
      <h1 style={{ color: '#3C1510', fontSize: '32px', fontWeight: 'bold', marginBottom: '24px' }}>
  
        Shrimply
  
      </h1>

      {/*login window  */}
  
      <div style={{ backgroundColor: '#E6CECB', padding: '32px', borderRadius: '12px', width: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '10px', borderRadius: '6px', border: 'solid', fontSize: '14px' }}
  
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '10px', borderRadius: '6px', border: 'solid', fontSize: '14px' }}
        
        />

        <button
          onClick={handleLogin}
          style={{ backgroundColor: '#E26050', color: 'white', padding: '10px', borderRadius: '6px', border: 'none', fontSize: '14px', cursor: 'pointer' }}>
          Login
        
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