import Sidebar from '../components/Sidebar';
import { useState, useEffect, useRef } from 'react';

type EducationInfo = {
  school: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
};

type ExperienceInfo = {
  company: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
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

  // Work experience
  const [experience, setExperience] = useState<ExperienceInfo[]>([]);
  const [experienceError, setExperienceError] = useState('');

  //career preferences
  const [targetRole, setTargetRole] = useState('');
  const [locationPreference, setLocationPreference] = useState('');
  const [workModePreference, setWorkModePreference] = useState('');
  const [SalaryExpectation, setSalaryExpectation] = useState('');

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
          setPhone(data.phone ? formatPhone(String(data.phone)) : '');
          setSummary(data.summary ?? '');
          setSkills(data.skills ?? []); //added this to load skills from the backend
          setEducation(data.education ?? []); //same for education
          setExperience(data.experience ?? []); //same for experience
          setTargetRole(data.target_role ?? '');
          setLocationPreference(data.location_preference ?? '');
          setWorkModePreference(data.work_mode_preference ?? '');
          setSalaryExpectation(data.salary_expectation ?? '');
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

  // Formats any raw phone value (digits only, with/without existing dashes,
  // a number from the backend, etc.) into 000-000-0000. Used both when
  // loading a saved phone number and when the user types.
  function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length >= 7) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length >= 4) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    return digits;
  }

  // Masks free text input into MM-YY as the user types: strips non-digits,
  // caps at 4 digits total, and auto-inserts the dash after the 2nd digit.
  // e.g. typing "0622" (or "06-22") becomes "06-22".
  function maskMonthYear(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }

  // Validates a fully-entered MM-YY string has a real month (01-12).
  // Partial input (e.g. "0" or "06-") is treated as not-yet-complete, not invalid.
  function isValidMonthYear(value: string): boolean {
    if (!value) return true; // empty is allowed; required-ness is checked elsewhere
    const match = value.match(/^(\d{2})-(\d{2})$/);
    if (!match) return false;
    const month = Number(match[1]);
    return month >= 1 && month <= 12;
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

  function validateEducation(): string | null {
    for (const entry of education) {
      if (!entry.school.trim() || !entry.degree.trim()) {
        const msg = 'Each education entry requires at least a school and degree.';
        setEducationError(msg);
        return msg;
      }
      if (entry.start_date && !isValidMonthYear(entry.start_date)) {
        const msg = 'Education start date must be in MM-YY format (e.g. 06-22).';
        setEducationError(msg);
        return msg;
      }
      if (entry.end_date && !isValidMonthYear(entry.end_date)) {
        const msg = 'Education end date must be in MM-YY format (e.g. 06-22).';
        setEducationError(msg);
        return msg;
      }
      if (
        entry.start_date &&
        entry.end_date &&
        isValidMonthYear(entry.start_date) &&
        isValidMonthYear(entry.end_date) &&
        entry.end_date < entry.start_date
      ) {
        const msg = 'Education end date cannot be earlier than start date.';
        setEducationError(msg);
        return msg;
      }
    }
    setEducationError('');
    return null;
  }

  //Experience handlers
  function handleAddExperience() {
    setExperienceError('');
    setExperience([
      ...experience,
      {
        company: '',
        title: '',
        location: '',
        start_date: '',
        end_date: '',
        is_current: false,
        description: '',
      },
    ]);
  }

  function handleExperienceChange(
    index: number,
    field: keyof ExperienceInfo,
    value: string | boolean
  ) {
    const updated = experience.map((entry, i) => {
      if (i !== index) return entry;
      const next = { ...entry, [field]: value };
      // if marked as current job, clear the end date so it doesn't conflict
      if (field === 'is_current' && value === true) {
        next.end_date = '';
      }
      return next;
    });
    setExperience(updated);
  }

  function handleDeleteExperience(index: number) {
    setExperience(experience.filter((_, i) => i !== index));
  }

  function validateExperience(): string | null {
    for (const entry of experience) {
      if (!entry.company.trim() || !entry.title.trim()) {
        const msg = 'Each experience entry requires at least a company and title.';
        setExperienceError(msg);
        return msg;
      }
      if (entry.start_date && !isValidMonthYear(entry.start_date)) {
        const msg = 'Experience start date must be in MM-YY format (e.g. 06-22).';
        setExperienceError(msg);
        return msg;
      }
      if (
        !entry.is_current &&
        entry.end_date &&
        !isValidMonthYear(entry.end_date)
      ) {
        const msg = 'Experience end date must be in MM-YY format (e.g. 06-22).';
        setExperienceError(msg);
        return msg;
      }
      if (
        !entry.is_current &&
        entry.start_date &&
        entry.end_date &&
        isValidMonthYear(entry.start_date) &&
        isValidMonthYear(entry.end_date) &&
        entry.end_date < entry.start_date
      ) {
        const msg = 'Experience end date cannot be earlier than start date.';
        setExperienceError(msg);
        return msg;
      }
    }
    setExperienceError('');
    return null;
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

    const educationIssue = validateEducation();
    if (educationIssue) {
      setError(educationIssue);
      return;
    }

    const experienceIssue = validateExperience();
    if (experienceIssue) {
      setError(experienceIssue);
      return;
    }

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
          experience,
          target_role: targetRole.trim() || null,
          location_preference: locationPreference.trim() || null,
          work_mode_preference: workModePreference.trim() || null,
          salary_expectation: SalaryExpectation.trim() || null,
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
                onChange={(e) => setPhone(formatPhone(e.target.value))}
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
                      Start Date (MM-YY)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM-YY"
                      maxLength={5}
                      value={entry.start_date}
                      onChange={(e) =>
                        handleEducationChange(
                          index,
                          'start_date',
                          maskMonthYear(e.target.value)
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
                      End Date (MM-YY)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM-YY"
                      maxLength={5}
                      value={entry.end_date}
                      onChange={(e) =>
                        handleEducationChange(
                          index,
                          'end_date',
                          maskMonthYear(e.target.value)
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

          {/* Experience */}
          <h2
            style={{
              color: '#3C1510',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '5px',
              marginTop: '24px',
            }}
          >
            Work Experience
          </h2>

          {experience.map((entry, index) => (
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
                    Company *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={entry.company}
                    onChange={(e) =>
                      handleExperienceChange(index, 'company', e.target.value)
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
                    Job Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer"
                    value={entry.title}
                    onChange={(e) =>
                      handleExperienceChange(index, 'title', e.target.value)
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
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Newark, NJ"
                    value={entry.location}
                    onChange={(e) =>
                      handleExperienceChange(index, 'location', e.target.value)
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
                      Start Date (MM-YY)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM-YY"
                      maxLength={5}
                      value={entry.start_date}
                      onChange={(e) =>
                        handleExperienceChange(
                          index,
                          'start_date',
                          maskMonthYear(e.target.value)
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
                      End Date (MM-YY)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM-YY"
                      maxLength={5}
                      disabled={entry.is_current}
                      value={entry.end_date}
                      onChange={(e) =>
                        handleExperienceChange(
                          index,
                          'end_date',
                          maskMonthYear(e.target.value)
                        )
                      }
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '6px',
                        border: 'solid',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: entry.is_current ? '#E6CECB' : 'white',
                        cursor: entry.is_current ? 'not-allowed' : 'auto',
                      }}
                    />
                  </div>
                </div>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  color: '#3C1510',
                  marginTop: '12px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={entry.is_current}
                  onChange={(e) =>
                    handleExperienceChange(
                      index,
                      'is_current',
                      e.target.checked
                    )
                  }
                />
                I currently work here
              </label>

              <div style={{ marginTop: '12px' }}>
                <label
                  style={{
                    fontSize: '13px',
                    color: '#3C1510',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Description
                </label>
                <textarea
                  value={entry.description}
                  onChange={(e) =>
                    handleExperienceChange(
                      index,
                      'description',
                      e.target.value
                    )
                  }
                  placeholder="Briefly describe your responsibilities and accomplishments..."
                  style={{
                    width: '100%',
                    height: '80px',
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'solid',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '8px',
                }}
              >
                <button
                  onClick={() => handleDeleteExperience(index)}
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

          {experienceError && (
            <p
              style={{
                color: '#932C20',
                fontSize: '13px',
                margin: '0 0 8px 0',
              }}
            >
              {experienceError}
            </p>
          )}

          <button
            onClick={handleAddExperience}
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
            + Add Experience
          </button>
          {/* Career Preferences */}
          <h2
            style={{
              color: '#3C1510',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '5px',
              marginTop: '24px',
            }}
          >
            Career Preferences
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '8px',
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
                Target Role
              </label>
              <input
                type="text"
                placeholder="e.g. Software Engineer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
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
                Preferred Location
              </label>
              <input
                type="text"
                placeholder="e.g. New York, NY"
                value={locationPreference}
                onChange={(e) => setLocationPreference(e.target.value)}
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
                Work Mode
              </label>
              <select
                value={workModePreference}
                onChange={(e) => setWorkModePreference(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'solid',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  backgroundColor: 'white',
                }}
              >
                <option value="">Select...</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-Site</option>
              </select>
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
                Salary Preference
              </label>
              <input
                type="text"
                placeholder="e.g. $80,000 - $100,000"
                value={SalaryExpectation}
                onChange={(e) => setSalaryExpectation(e.target.value)}
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

        {error && (
          <div
            role="alert"
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              maxWidth: '360px',
              backgroundColor: '#932C20',
              color: '#FFFFFF',
              padding: '14px 16px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '14px',
              zIndex: 1000,
            }}
          >
            <span style={{ flex: 1 }}>{error}</span>
            <button
              onClick={() => setError('')}
              aria-label="Dismiss error"
              style={{
                background: 'none',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                fontSize: '16px',
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}