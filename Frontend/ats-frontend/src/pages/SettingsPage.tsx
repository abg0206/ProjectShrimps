import Sidebar from '../components/Sidebar'
import { useState } from 'react'

export default function SettingsPage() {
  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  return (
    
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#D9958C' }}>

      <Sidebar />

      <div style={{ flex: 1, padding: '32px' }}>

        <h1 style={{ color: '#3C1510', fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
          Settings
        
        </h1>

        {/* change email */}
        <div style={{ backgroundColor: '#E6CECB', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
          <h2 style={{ color: '#3C1510', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
            Change Email
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#3C1510', display: 'block', marginBottom: '4px' }}>New Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: 'solid', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button style={{ backgroundColor: '#932C20', color: '#E6CECB', padding: '8px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                Update Email
              </button>
            </div>
          </div>
        </div>

        {/* change password */}
        <div style={{ backgroundColor: '#E6CECB', borderRadius: '10px', padding: '24px' }}>
          <h2 style={{ color: '#3C1510', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
            Change Password
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#3C1510', display: 'block', marginBottom: '4px' }}>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: 'solid', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#3C1510', display: 'block', marginBottom: '4px' }}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: 'solid', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#3C1510', display: 'block', marginBottom: '4px' }}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: 'solid', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button style={{ backgroundColor: '#932C20', color: '#E6CECB', padding: '8px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                Update Password
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}