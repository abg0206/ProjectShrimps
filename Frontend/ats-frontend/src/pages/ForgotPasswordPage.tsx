import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit() {
    if (!email) return
    setSubmitted(true)
  }

  return (
    <div style={{ backgroundColor: '#D9958C', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

      <h1 style={{ color: '#3C1510', fontSize: '32px', fontWeight: 'bold', marginBottom: '24px' }}>

        Shrimply
      
      </h1>

      <div style={{ backgroundColor: '#E6CECB', padding: '32px', borderRadius: '12px', width: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <h2 style={{ color: '#3C1510', fontSize: '20px', fontWeight: 'bold', margin: 0, textAlign: 'center' }}>

          Reset your password
        
        </h2>

        {submitted ? (
          <p style={{ color: '#3C1510', fontSize: '14px', textAlign: 'center' }}>

            If an account exists for {email}, a reset link will be sent to email.
          
          </p>
        ) : (
          <>
            <p style={{ color: '#3C1510', fontSize: '13px', textAlign: 'center', margin: 0 }}>

              Enter your email and check you inbox for reset link.
            
            </p>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: 'solid', fontSize: '14px' }}
            />

            <button
              onClick={handleSubmit}
              style={{ backgroundColor: '#E26050', color: 'white', padding: '10px', borderRadius: '6px', border: 'none', fontSize: '14px', cursor: 'pointer' }}>

              Send Reset Link
            
            </button>
          </>
        )}

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#3C1510' }}>
          <a href="/" style={{ color: '#932C20' }}>Back to Login</a>
        </p>

 
 
 
 
 
 
      </div>
    </div>
  )
}