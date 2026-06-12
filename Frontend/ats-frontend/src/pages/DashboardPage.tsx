import Sidebar from '../components/Sidebar'

export default function DashboardPage() {
  const jobs = [
    { id: 1, title: 'Software Engineer', company: 'Google', status: 'Applied', date: '6/1/2026' },
    { id: 2, title: 'Frontend Developer', company: 'Meta', status: 'Interview', date: '6/3/2026' },
    { id: 3, title: 'React Developer', company: 'Amazon', status: 'Interested', date: '6/5/2026' },
    { id: 4, title: 'UI Engineer', company: 'Apple', status: 'Offer', date: '6/6/2026' },
    { id: 5, title: 'Web Developer', company: 'Netflix', status: 'Rejected', date: '6/7/2026' },
    { id: 6, title: 'Full Stack Dev', company: 'Spotify', status: 'Applied', date: '6/8/2026' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#D9958C' }}>
      
      <Sidebar />

      {/* main page styling */}
      <div style={{ flex: 1, padding: '32px' }}>
        
        {/* top part  */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>

          <h1 style={{ color: '#3C1510', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>My Dashboard</h1>

          <button style={{ backgroundColor: '#932C20', color: '#E6CECB', padding: '8px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
            Add Job
          </button>
        </div>

        {/* search bar for the dashboard */}
        <form>
        <input
          type="text"
          placeholder="Search jobs..."
          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none', marginBottom: '24px', fontSize: '14px', boxSizing: 'border-box' }}
        
        />
        <button type="submit"style={{ backgroundColor: '#932C20', color: '#E6CECB', padding: '5px 10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
          Search
        </button>
        </form>

        <br />
        <br />
      

        {/* job cards*/}
        <header style={{ color: '#3C1510', fontSize: '20px', fontWeight: 'bold', margin: 0}}>My Jobs</header>
        <div style={{ display: 'grid' , gridTemplateColumns: 'repeat(3, 1fr)',width: '100%', gap: '40px'}}>
         
          {jobs.map((job) => (
         
              <div key={job.id} style={{ backgroundColor: '#E6CECB', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
              
              <p style={{ fontWeight: 'bold', color: '#3C1510', margin: 0 }}>{job.title}</p>
              
              <p style={{ color: '#3C1510', margin: 0, fontSize: '14px'}}>{job.company}</p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', fontSize: '13px', color: '#932C20' }}>
              
                <span>Applied: {job.date}</span>
              
                <span>Status: {job.status}</span>
            
              </div>
            
            </div>
          ))}
        </div>

      </div>
  
    </div>
  

  )
}

