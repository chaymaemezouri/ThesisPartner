import { DashboardView } from '../features/dashboard/DashboardView';
import { SupervisorDashboard } from '../features/supervision/SupervisorDashboard';
import { useSupervisedTheses } from '../features/supervision/hooks/use-supervised-theses';

export function DashboardPage() {
  const supervised = useSupervisedTheses();
  if ((supervised.data?.theses.length ?? 0) > 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 lg:gap-2">
        <SupervisorDashboard />
      </div>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 lg:gap-2">
      <DashboardView />
    </div>
  );
}
