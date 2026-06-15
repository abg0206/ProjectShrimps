import { Navigate } from 'react-router-dom';

export default function RouteProtect({
  children,
}: {
  children: React.ReactNode;
}) {
  const isLoggedIn = !!sessionStorage.getItem('user');

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
