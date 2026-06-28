import Sidebar from '../components/Sidebar';
import { useState, useEffect, useRef } from 'react';

type EducationInfo = {
  school: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
};

export default function ProfilePage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [summary, setSummary] = useState('');

  //Adding skills
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [skillError, setSkillError] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [education, setEducation] = useState<EducationInfo[]>([]);
  const [educationError, setEducationError] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Read the logged-in user's email from sessionStorage (set by LoginPage)
  const session = JSON.parse(sessionStorage.getItem('user') ?? '{}');
  const userEmail = session.email ?? '';

  // Load profile from the backend on mount
  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    fetch(`/api/profile/${encodeURIComponent(userEmail)}`)
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
          setSkills(data.skills ?? []); //added this to load skills from the backend
          setEducation(data.education ?? []); //same for education
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

  //Skills here
  function handleAddSkill() {
    setSkillError('');
    const trimmed = skillInput.trim();

    if (!trimmed) {
      setSkillError('Please enter a skill.');
      return;
    }
    if (skills.map((s) => s.toLowerCase()).includes(trimmed.toLowerCase())) {
      setSkillError('That skill has already been added.');
      return;
    }

    setSkills([...skills, trimmed]);
    setSkillInput('');
  }

  function handleDeleteSkill(index: number) {
    setSkills(skills.filter((_, i) => i !== index));
  }

  function handleAddEducation() {
    setEducationError('');
    setEducation([
      ...education,
      {
        school: '',
        degree: '',
        field_of_study: '',
        start_date: '',
        end_date: '',
      },
    ]);
  }

  //Education information handlers
  function handleEducationChange(
    index: number,
    field: keyof EducationInfo,
    value: string
  ) {
    const updated = education.map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry
    );
    setEducation(updated);
  }

  function handleDeleteEducation(index: number) {
    setEducation(education.filter((_, i) => i !== index));
  }

  function validateEducation() {
    for (const entry of education) {
      if (!entry.school.trim() || !entry.degree.trim()) {
        setEducationError('Each entry requires at least a school and degree.');
        return false;
      }
      if (
        entry.start_date &&
        entry.end_date &&
        entry.end_date < entry.start_date
      ) {
        setEducationError('End date cannot be earlier than start date.');
        return false;
      }
    }
    return true;
  }

  function handleProfilePictureChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfilePicture(file);
  }

  async function handleSave() {
    setError('');
    setSaved(false);

    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }
    if (!validateEducation()) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(userEmail)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() ? phone.trim() : null,
          summary: summary.trim() || null,
          skills, //added these to the profile save function
          education,
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

        {/* profile picture */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              backgroundColor: '#3C1510',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              overflow: 'hidden',
              marginBottom: '8px',
            }}
          >
            {profilePicture ? (
              <img
                src={URL.createObjectURL(profilePicture)}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span
                style={{
                  color: '#E6CECB',
                  fontSize: '13px',
                  textAlign: 'center',
                  padding: '8px',
                }}
              >
                Click to upload
              </span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleProfilePictureChange}
            style={{ display: 'none' }}
          />
          {profilePicture && (
            <button
              onClick={() => setProfilePicture(null)}
              style={{
                fontSize: '12px',
                color: '#932C20',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Remove photo
            </button>
          )}
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
                placeholder="First Name"
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
                placeholder="Last Name"
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
                placeholder="Email"
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
                Phone
              </label>

              <input
                type="text"
                placeholder="123-456-7890"
                value={phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  let formatted = digits;
                  if (digits.length >= 7) {
                    formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
                  } else if (digits.length >= 4) {
                    formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
                  }
                  setPhone(formatted);
                }}
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

          {/* Education */}
          <h2
            style={{
              color: '#3C1510',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '5px',
              marginTop: '24px',
            }}
          >
            Education
          </h2>

          {education.map((entry, index) => (
            <div
              key={index}
              style={{
                backgroundColor: '#D9958C',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
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
                    School *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NJIT"
                    value={entry.school}
                    onChange={(e) =>
                      handleEducationChange(index, 'school', e.target.value)
                    }
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
                    Degree *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bachelor of Science"
                    value={entry.degree}
                    onChange={(e) =>
                      handleEducationChange(index, 'degree', e.target.value)
                    }
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
                    Field of Study
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={entry.field_of_study}
                    onChange={(e) =>
                      handleEducationChange(
                        index,
                        'field_of_study',
                        e.target.value
                      )
                    }
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

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
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
                      Start Date
                    </label>
                    <input
                      type="month"
                      value={entry.start_date}
                      onChange={(e) =>
                        handleEducationChange(
                          index,
                          'start_date',
                          e.target.value
                        )
                      }
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
                      End Date
                    </label>
                    <input
                      type="month"
                      value={entry.end_date}
                      onChange={(e) =>
                        handleEducationChange(index, 'end_date', e.target.value)
                      }
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
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '8px',
                }}
              >
                <button
                  onClick={() => handleDeleteEducation(index)}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#932C20',
                    border: '2px solid #932C20',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {educationError && (
            <p
              style={{
                color: '#932C20',
                fontSize: '13px',
                margin: '0 0 8px 0',
              }}
            >
              {educationError}
            </p>
          )}

          <button
            onClick={handleAddEducation}
            style={{
              backgroundColor: 'transparent',
              color: '#932C20',
              border: '2px solid #932C20',
              padding: '6px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '8px',
            }}
          >
            + Add Education
          </button>

          <h2
            style={{
              color: '#3C1510',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '5px',
              marginTop: '24px',
            }}
          >
            Skills
          </h2>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              placeholder="e.g. React, Python, SQL"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSkill();
              }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: 'solid',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleAddSkill}
              style={{
                backgroundColor: '#932C20',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Add
            </button>
          </div>

          {skillError && (
            <p
              style={{
                color: '#932C20',
                fontSize: '13px',
                margin: '0 0 8px 0',
              }}
            >
              {skillError}
            </p>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {skills.map((skill, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: '#932C20',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {skill}
                <button
                  onClick={() => handleDeleteSkill(index)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <h2
            style={{
              color: '#3C1510',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '5px',
              marginTop: '24px',
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
              disabled={saving}
              style={{
                backgroundColor: '#932C20',
                color: '#FFFFFF',
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
