import Sidebar from '../components/Sidebar'
import { useState } from 'react'

export default function ProfilePage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [summary, setSummary] = useState('')
  const [saved, setSaved] = useState(false)

  function getCompletion() {
    const fields = [firstName, lastName, email, phone, summary]
    const filled = fields.filter((f) => f.trim() !== '').length
    return Math.round((filled / fields.length) * 100)
  }

  function handleSave() {
    
    setSaved(true)
  
  }

  return (
  
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#D9958C' }}>
      
      <Sidebar />

      <div style={{ flex: 1, padding: '32px' }}>

        <h1 style={{ color: '#3C1510', fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
        
          Profile
        
        </h1>

        {/* Progress bar */}
        <div style={{ marginBottom: '24px' }}>
          
          <div style={{ backgroundColor: '#E6CECB', borderRadius: '999px', height: '10px', width: '100%', marginBottom: '4px' }}>
          
          <div style={{ backgroundColor: '#932C20', height: '10px', borderRadius: '999px', width: `${getCompletion()}%`, transition: 'width 0.3s' }} />
          
          </div>
          
          <p style={{ fontSize: '13px', color: '#3C1510' }}>{getCompletion()}% complete</p>
        
        </div>

        {/* Identity & Contact */}
        
        <div style={{ backgroundColor: '#FFF', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
          
          <h2 style={{ color: '#3C1510', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
            
            Identity & Contact
          
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            
            <div>
              
              <label style={{ fontSize: '13px', color: '#3C1510', display: 'block', marginBottom: '4px' }}>First Name</label>
              
              <input
                
                type="text"
                
                value={firstName}
                
                onChange={(e) => setFirstName(e.target.value)}
                
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: 'solid', fontSize: '14px', boxSizing: 'border-box' }}
              
              />
            
            </div>
            
            <div>
              
              <label style={{ fontSize: '13px', color: '#3C1510', display: 'block', marginBottom: '4px' }}>Last Name</label>
              
              <input
                
                type="text"
                
                value={lastName}
                
                onChange={(e) => setLastName(e.target.value)}
                
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: 'solid', fontSize: '14px', boxSizing: 'border-box' }}
              
              />
            
            </div>
            
            <div>
              <label style={{ fontSize: '13px', color: '#3C1510', display: 'block', marginBottom: '4px' }}>Email</label>
            
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: 'solid', fontSize: '14px', boxSizing: 'border-box' }}
            
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#3C1510', display: 'block', marginBottom: '4px' }}>Phone</label>
              
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: 'solid', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            
            <button
              onClick={handleSave}
              style={{ backgroundColor: '#932C20', padding: '8px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
              Save
            </button>
          </div>
        </div>

        {/* Professional Summary */}
        <div style={{ backgroundColor: '#FFF', borderRadius: '10px', padding: '24px' }}>
          <h2 style={{ color: '#3C1510', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
            Professional Summary
          </h2>
          <textarea
          
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Write a brief summary about your professional background, skills, and career goals..."
            style={{ width: '100%', height: '120px', padding: '8px', borderRadius: '6px', border: 'solid', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            
            <button
              onClick={handleSave}
              style={{ backgroundColor: '#932C20', color: '#E6CECB', padding: '8px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
              Save
            </button>
          </div>
        </div>

        {saved && (
          <p style={{ color: '#3C1510', marginTop: '16px', fontSize: '14px' }}>
            ✓ Profile saved successfully
          </p>
        )}

      </div>
    </div>
  )
}