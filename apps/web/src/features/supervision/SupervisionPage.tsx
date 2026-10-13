import { Navigate } from 'react-router-dom';
import { useSupervisedTheses } from './hooks/use-supervised-theses';
import { SupervisorDashboard } from './SupervisorDashboard';

export function SupervisionPage() {
  const supervised = useSupervisedTheses();

  if (supervised.isSuccess && supervised.data.theses.length === 0) {
    return <Navigate to="/" replace />;
  }

  return <SupervisorDashboard layout="list" />;
}
