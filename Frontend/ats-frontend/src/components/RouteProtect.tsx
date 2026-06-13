import { Navigate } from 'react-router-dom'

export default function RouteProtect({ children }: { children: React.ReactNode }) {
 
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'

  if (!isLoggedIn) {

    return <Navigate to="/" replace />

   }

  return <>{children}</>
}