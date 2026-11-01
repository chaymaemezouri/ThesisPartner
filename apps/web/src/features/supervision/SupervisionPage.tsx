import { Navigate } from 'react-router-dom';
import { useSupervisedTheses } from './hooks/use-supervised-theses';
import { SupervisorDashboard } from './SupervisorDashboard';
import { isSupervisorWorkspace } from './workspace-mode';

export function SupervisionPage() {
  const supervised = useSupervisedTheses();

  if (supervised.isSuccess && !isSupervisorWorkspace(supervised.data)) {
    return <Navigate to="/" replace />;
  }

  return <SupervisorDashboard layout="list" />;
}
