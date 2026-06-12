import { NavLink } from 'react-router-dom'

export default function Sidebar() {
  return (
    <div style={{ backgroundColor: '#E6CECB', width: '200px', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '16px' }}>
      
      {/* App name */}
      <h2 style={{ color: '#3C1510', textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
        Shrimply
      </h2>

      {/* Profile picture circle */}
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#3C1510', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E6CECB', margin: '0 auto 8px', fontSize: '18px', fontWeight: 'bold' }}>
        CS
      </div>

      {/* Username */}
      <p style={{ textAlign: 'center', color: '#3C1510', fontSize: '14px', marginBottom: '24px' }}>
        Caridean Shrimp
      </p>

      {/* Nav links */}
      <NavLink to="/dashboard"
        style={({ isActive }) => ({
          color: isActive ? '#E6CECB' : '#3C1510',
          backgroundColor: isActive ? '#932C20' : 'transparent',
          padding: '8px 12px',
          borderRadius: '6px',
          textDecoration: 'none',
          marginBottom: '4px',
          fontSize: '14px'
        })}>
        Dashboard
      </NavLink>

      <NavLink to="/profile"
        style={({ isActive }) => ({
          color: isActive ? '#E6CECB' : '#3C1510',
          backgroundColor: isActive ? '#932C20' : 'transparent',
          padding: '8px 12px',
          borderRadius: '6px',
          textDecoration: 'none',
          marginBottom: '4px',
          fontSize: '14px'
        })}>
        Profile
      </NavLink>

      <NavLink to="/settings"
        style={({ isActive }) => ({
          color: isActive ? '#E6CECB' : '#3C1510',
          backgroundColor: isActive ? '#932C20' : 'transparent',
          padding: '8px 12px',
          borderRadius: '6px',
          textDecoration: 'none',
          marginBottom: '4px',
          fontSize: '14px'
        })}>
        Settings
      </NavLink>

    </div>
  )
}