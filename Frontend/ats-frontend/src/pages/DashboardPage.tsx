import Sidebar from '../components/Sidebar';
import { useState } from 'react';

export default function DashboardPage() {
  const [jobs, setJobs] = useState([
    {
      id: 1,
      title: 'Software Engineer',
      company: 'Google',
      status: 'Applied',
      date: '6/1/2026',
      body: 'We are looking for a Software Engineer to join our team for the 2027 summer.',
    },
    {
      id: 2,
      title: 'Frontend Developer',
      company: 'Meta',
      status: 'Interview',
      date: '6/3/2026',
      body: 'We are seeking a Frontend Developer with experience in Frontend development.',
    },
    {
      id: 3,
      title: 'React Developer',
      company: 'Amazon',
      status: 'Interested',
      date: '6/5/2026',
      body: 'Join our team to build Frontend Applications using React.',
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newBody, setNewBody] = useState('');

  function handleAddJob() {
    const newJob = {
      id: jobs.length + 1,
      title: newTitle,
      company: newCompany,
      status: 'Interested',
      date: new Date().toLocaleDateString(),
      body: newBody,
    };
    setJobs([...jobs, newJob]);
    setNewTitle('');
    setNewCompany('');
    setNewBody('');
    setShowModal(false);
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <h1
            style={{
              color: '#3C1510',
              fontSize: '24px',
              fontWeight: 'bold',
              margin: 0,
            }}
          >
            My Jobs
          </h1>
          <button
            onClick={() => setShowModal(true)}
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
            Add Job
          </button>
        </div>

        <input
          type="text"
          placeholder="Search jobs..."
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: 'solid',
            marginBottom: '24px',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
          }}
        >
          {jobs.map((job) => (
            <div
              key={job.id}
              style={{
                backgroundColor: '#E6CECB',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                minHeight: '200px',
              }}
            >
              <p style={{ fontWeight: 'bold', color: '#3C1510', margin: 0 }}>
                {job.title}
              </p>
              <p style={{ color: '#3C1510', margin: 0, fontSize: '14px' }}>
                {job.company}
              </p>
              <p
                style={{
                  color: '#3C1510',
                  margin: 0,
                  fontSize: '13px',
                  flex: 1,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical' as const,
                }}
              >
                {job.body}
              </p>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  color: '#932C20',
                }}
              >
                <span>Applied: {job.date}</span>
                <span>Status: {job.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Job Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: '#E6CECB',
              borderRadius: '10px',
              padding: '24px',
              width: '400px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <h2
              style={{
                color: '#3C1510',
                fontSize: '18px',
                fontWeight: 'bold',
                margin: 0,
              }}
            >
              Add Job
            </h2>

            <div>
              <label
                style={{
                  fontSize: '13px',
                  color: '#3C1510',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Job Title
              </label>

              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'none',
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
                Company
              </label>

              <input
                type="text"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'none',
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
                Job Posting Body
              </label>
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                style={{
                  width: '100%',
                  height: '100px',
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'none',
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
                gap: '8px',
                marginTop: '8px',
              }}
            >
              <button
                onClick={() => setShowModal(false)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#3C1510',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: '1px solid #3C1510',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddJob}
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
                Add Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
