import { Navigate } from 'react-router-dom';
import { useSupervisedTheses } from './hooks/use-supervised-theses';
import { SupervisorDashboard } from './SupervisorDashboard';
import { canOpenSupervision } from './workspace-mode';

export function SupervisionPage() {
  const supervised = useSupervisedTheses();

  if (supervised.isSuccess && !canOpenSupervision(supervised.data)) {
    return <Navigate to="/" replace />;
  }

  return <SupervisorDashboard layout="gallery" />;
}
