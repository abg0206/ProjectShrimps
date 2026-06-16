import { Navigate } from 'react-router-dom';

export default function RouteProtect({
  children,
}: {
  children: React.ReactNode;
}) {
  //const isLoggedIn = !!sessionStorage.getItem('user');
  const user = sessionStorage.getItem('user');
  const isLoggedIn =
    user !== null && user !== '' && user !== 'null' && user !== 'undefined';

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
