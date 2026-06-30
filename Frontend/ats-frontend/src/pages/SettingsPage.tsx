import Sidebar from '../components/Sidebar';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const session = JSON.parse(sessionStorage.getItem('user') ?? '{}');
  const userEmail = session.email ?? '';
  const navigate = useNavigate();

  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [emailError, setEmailError] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleUpdateEmail() {
    setEmailError('');
    setEmailSaved(false);

    if (!newEmail.trim()) {
      setEmailError('Please enter a new email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    if (newEmail === userEmail) {
      setEmailError('New email must be different from your current email.');
      return;
    }

    setEmailLoading(true);
    try {
      const res = await fetch('/api/settings/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentEmail: userEmail, newEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEmailError(data.error ?? 'Failed to update email.');
        return;
      }

      // Update session with new email
      sessionStorage.setItem(
        'user',
        JSON.stringify({ ...session, email: newEmail })
      );
      setNewEmail('');
      setEmailSaved(true);
    } catch  {
      setEmailError('Could not connect to the server. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleUpdatePassword() {
    setPasswordError('');
    setPasswordSaved(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error ?? 'Failed to update password.');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSaved(true);
    } catch {
      setPasswordError('Could not connect to the server. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteError('');
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userEmail)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error ?? 'Failed to delete account.');
        return;
      }

      sessionStorage.removeItem('user');
      navigate('/');
    } catch  {
      setDeleteError('Could not connect to the server. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#D9958C',
      }}
    >
      <Sidebar />

      <div style={{ flex: 1, padding: '32px' }}>
        <h1
          style={{
            color: '#3C1510',
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '24px',
          }}
        >
          Settings
        </h1>

        {/* change email */}
        <div
          style={{
            backgroundColor: '#E6CECB',
            borderRadius: '10px',
            padding: '24px',
            marginBottom: '16px',
          }}
        >
          <h2
            style={{
              color: '#3C1510',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '16px',
            }}
          >
            Change Email
          </h2>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxWidth: '400px',
            }}
          >
            <div>
              <label
                style={{
                  fontSize: '13px',
                  color: '#3C1510',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Current Email
              </label>
              <input
                type="email"
                value={userEmail}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'solid',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
                readOnly
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: '13px',
                  color: '#3C1510',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                New Email
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'solid',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {emailError && (
              <p style={{ color: '#932C20', fontSize: '13px', margin: 0 }}>
                {emailError}
              </p>
            )}
            {emailSaved && (
              <p style={{ color: '#3C1510', fontSize: '13px', margin: 0 }}>
                Email updated successfully
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleUpdateEmail}
                disabled={emailLoading}
                style={{
                  backgroundColor: '#932C20',
                  color: '#E6CECB',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: emailLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: emailLoading ? 0.7 : 1,
                }}
              >
                {emailLoading ? 'Updating…' : 'Update Email'}
              </button>
            </div>
          </div>
        </div>

        {/* change password */}
        <div
          style={{
            backgroundColor: '#E6CECB',
            borderRadius: '10px',
            padding: '24px',
          }}
        >
          <h2
            style={{
              color: '#3C1510',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '16px',
            }}
          >
            Change Password
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxWidth: '400px',
            }}
          >
            <div>
              <label
                style={{
                  fontSize: '13px',
                  color: '#3C1510',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'solid',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: '13px',
                  color: '#3C1510',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'solid',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: '13px',
                  color: '#3C1510',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'solid',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {passwordError && (
              <p style={{ color: '#932C20', fontSize: '13px', margin: 0 }}>
                {passwordError}
              </p>
            )}
            {passwordSaved && (
              <p style={{ color: '#3C1510', fontSize: '13px', margin: 0 }}>
                Password updated successfully
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleUpdatePassword}
                disabled={passwordLoading}
                style={{
                  backgroundColor: '#932C20',
                  color: '#E6CECB',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: passwordLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: passwordLoading ? 0.7 : 1,
                }}
              >
                {passwordLoading ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>

        {/* delete account */}
        <div
          style={{
            backgroundColor: '#E6CECB',
            borderRadius: '10px',
            padding: '24px',
            marginTop: '16px',
          }}
        >
          <h2
            style={{
              color: '#932C20',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '8px',
            }}
          >
            Delete Account
          </h2>
          <p
            style={{
              fontSize: '13px',
              color: '#3C1510',
              marginBottom: '16px',
            }}
          >
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                backgroundColor: '#932C20',
                color: 'white',
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Delete Account
            </button>
          ) : (
            <div
              style={{
                backgroundColor: '#D9958C',
                borderRadius: '8px',
                padding: '16px',
                maxWidth: '400px',
              }}
            >
              <p
                style={{
                  fontSize: '14px',
                  color: '#3C1510',
                  fontWeight: 'bold',
                  marginBottom: '16px',
                }}
              >
                Are you sure? This will permanently delete your account.
              </p>
              {deleteError && (
                <p
                  style={{
                    color: '#932C20',
                    fontSize: '13px',
                    marginBottom: '12px',
                  }}
                >
                  {deleteError}
                </p>
              )}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  style={{
                    backgroundColor: '#932C20',
                    color: 'white',
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: deleteLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: deleteLoading ? 0.7 : 1,
                  }}
                >
                  {deleteLoading ? 'Deleting…' : 'Yes, Delete My Account'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteError('');
                  }}
                  disabled={deleteLoading}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#3C1510',
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: '2px solid #3C1510',
                    cursor: deleteLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
