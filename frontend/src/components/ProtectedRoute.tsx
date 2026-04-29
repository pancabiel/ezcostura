import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, type Role } from '../stores/authStore';

interface Props {
  children: React.ReactNode;
  roles?: Role[];
}

export default function ProtectedRoute({ children, roles }: Props) {
  const session = useAuthStore((s) => s.session);
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (roles && !roles.includes(session.role)) {
    return <Navigate to="/facilitador" replace />;
  }
  return <>{children}</>;
}
