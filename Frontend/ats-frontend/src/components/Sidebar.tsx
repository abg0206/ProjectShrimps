import { NavLink } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const navigate = useNavigate();
  const session = JSON.parse(sessionStorage.getItem('user') ?? '{}');
  const userEmail = session.email ?? '';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    if (!userEmail) return;

    fetch(`/api/profile/${encodeURIComponent(userEmail)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setFirstName(data.first_name ?? '');
          setLastName(data.last_name ?? '');
        }
      })
      .catch(console.error);
  }, [userEmail]);

  const initials =
    firstName && lastName
      ? `${firstName[0]}${lastName[0]}`.toUpperCase()
      : userEmail.slice(0, 2).toUpperCase();

  const displayName =
    firstName && lastName ? `${firstName} ${lastName}` : userEmail;

  function handleLogout() {
    sessionStorage.removeItem('user');
    navigate('/');
  }

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    color: isActive ? '#E6CECB' : '#3C1510',
    backgroundColor: isActive ? '#932C20' : 'transparent',
    padding: '8px 12px',
    borderRadius: '6px',
    textDecoration: 'none',
    marginBottom: '4px',
    fontSize: '14px',
    display: 'block',
  });

  return (
    <div
      style={{
        backgroundColor: '#E6CECB',
        width: '200px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
      }}
    >
      {/* app name */}
      <h2
        style={{
          color: '#3C1510',
          textAlign: 'center',
          fontSize: '20px',
          fontWeight: 'bold',
          marginBottom: '16px',
        }}
      >
        Shrimply
      </h2>

      {/* profile picture circle */}
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#3C1510',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#E6CECB',
          margin: '0 auto 8px',
          fontSize: '18px',
          fontWeight: 'bold',
        }}
      >
        {initials}
      </div>

      {/* username */}
      <p
        style={{
          textAlign: 'center',
          color: '#3C1510',
          fontSize: '14px',
          marginBottom: '24px',
        }}
      >
        {displayName}
      </p>

      {/* Nav links */}
      <NavLink to="/dashboard" style={linkStyle}>
        Dashboard
      </NavLink>
      <NavLink to="/archived" style={linkStyle}>
        Archive
      </NavLink>
      <NavLink to="/profile" style={linkStyle}>
        Profile
      </NavLink>
      <NavLink to="/settings" style={linkStyle}>
        Settings
      </NavLink>

      <button
        onClick={handleLogout}
        style={{
          marginTop: 'auto',
          backgroundColor: '#932C20',
          color: '#FFFFFF',
          border: '10px solid #932C20',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        Logout
      </button>
    </div>
  );
}
