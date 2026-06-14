import Sidebar from '../components/Sidebar';
import { useState, useEffect } from 'react';

export default function ProfilePage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [summary, setSummary] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Read the logged-in user's email from sessionStorage (set by LoginPage)
  const session = JSON.parse(sessionStorage.getItem('user') ?? '{}');
  const userEmail = session.email ?? '';

  // Load profile from the backend on mount
  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    fetch(`/profile/${encodeURIComponent(userEmail)}`)
      .then((res) => {
        if (res.status === 404) return null; // no profile row yet — that's fine
        if (!res.ok) throw new Error('Failed to load profile');
        return res.json();
      })
      .then((data) => {
        if (data) {
          setFirstName(data.first_name ?? '');
          setLastName(data.last_name ?? '');
          setEmail(userEmail);
          setPhone(data.phone ? String(data.phone) : '');
          setSummary(data.summary ?? '');
        } else {
          setEmail(userEmail);
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Could not load profile. Please refresh and try again.');
      })
      .finally(() => setLoading(false));
  }, [userEmail]);

  function getCompletion() {
    const fields = [firstName, lastName, email, phone, summary];
    const filled = fields.filter((f) => f.trim() !== '').length;
    return Math.round((filled / fields.length) * 100);
  }

  async function handleSave() {
    setError('');
    setSaved(false);

    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/profile/${encodeURIComponent(userEmail)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          summary: summary.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to save profile.');
        return;
      }

      setSaved(true);
    } catch (err) {
      console.error(err);
      setError('Could not connect to the server. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          backgroundColor: '#D9958C',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: '#3C1510', fontSize: '16px' }}>Loading profile...</p>
      </div>
    );
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
            marginBottom: '16px',
          }}
        >
          Profile
        </h1>

        {/* progress bar */}
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              backgroundColor: '#E6CECB',
              borderRadius: '999px',
              height: '10px',
              width: '100%',
              marginBottom: '4px',
            }}
          >
            <div
              style={{
                backgroundColor: '#932C20',
                height: '10px',
                borderRadius: '999px',
                width: `${getCompletion()}%`,
                transition: 'width 0.3s',
              }}
            />
          </div>

          <p style={{ fontSize: '13px', color: '#3C1510' }}>
            {getCompletion()}% complete
          </p>
        </div>

        {/* id */}

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
            Identity & Contact
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
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
                First Name
              </label>

              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
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
                Last Name
              </label>

              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
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
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                Phone
              </label>

              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '16px',
            }}
          >
            <button
              onClick={handleSave}
              style={{
                backgroundColor: '#932C20',
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Save
            </button>
          </div>
        </div>

        {/* professional summary */}
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
            Professional Summary
          </h2>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Write a brief summary about your professional background, skills, and career goals..."
            style={{
              width: '100%',
              height: '120px',
              padding: '8px',
              borderRadius: '6px',
              border: 'solid',
              fontSize: '14px',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '16px',
            }}
          >
            <button
              onClick={handleSave}
              style={{
                backgroundColor: '#932C20',
                color: '#E6CECB',
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
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
  );
}
