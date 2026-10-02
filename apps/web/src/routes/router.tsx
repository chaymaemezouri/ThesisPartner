import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Skeleton } from '@thesispartner/ui';
import { RequireAuth } from '../layouts/RequireAuth';
import { AppShell } from '../layouts/AppShell';
import { ForgotPasswordPage, ResetPasswordPage } from '../pages/auth/RecoveryPages';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage';
import {
  DoctoralObjectiveDetailPage,
  DoctoralObjectivesPage,
} from '../features/objectives/DoctoralObjectivesPage';
import {
  SupervisorObjectiveDetailPage,
  SupervisorObjectivesPage,
} from '../features/objectives/SupervisorObjectivesPage';
import {
  DoctoralRemarkDetailPage,
  DoctoralRemarksPage,
} from '../features/remarks/DoctoralRemarksPage';
import {
  SupervisorRemarkDetailPage,
  SupervisorRemarksPage,
} from '../features/remarks/SupervisorRemarksPage';
import { SupervisionPage } from '../features/supervision/SupervisionPage';
import { SupervisorDossierPage } from '../features/supervision/SupervisorDossierPage';
import { SupervisorDeliverablesIndex } from '../features/supervision/SupervisorDeliverablesIndex';
import { useSupervisedTheses } from '../features/supervision/hooks/use-supervised-theses';
import { ProfilePage } from '../features/profile/ProfilePage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ModulePage } from '../pages/ModulePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { useT } from '../i18n/LocaleContext';
import { NAV_ITEMS } from './nav';

const DoctoralDeliverablesPage = lazy(() =>
  import('../features/deliverables/DoctoralDeliverablesPage').then((module) => ({
    default: module.DoctoralDeliverablesPage,
  })),
);
const DoctoralDeliverableDetailPage = lazy(() =>
  import('../features/deliverables/DoctoralDeliverablesPage').then((module) => ({
    default: module.DoctoralDeliverableDetailPage,
  })),
);
const SupervisorDeliverablesPage = lazy(() =>
  import('../features/deliverables/SupervisorDeliverablesPage').then((module) => ({
    default: module.SupervisorDeliverablesPage,
  })),
);
const SupervisorDeliverableDetailPage = lazy(() =>
  import('../features/deliverables/SupervisorDeliverablesPage').then((module) => ({
    default: module.SupervisorDeliverableDetailPage,
  })),
);

function DeliverablesEntry() {
  const supervised = useSupervisedTheses();
  if ((supervised.data?.theses.length ?? 0) > 0) return <SupervisorDeliverablesIndex />;
  return (
    <Deferred>
      <DoctoralDeliverablesPage />
    </Deferred>
  );
}

function Deferred({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div aria-busy="true">
          <Skeleton className="h-40" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export function AppRoutes() {
  const t = useT();
  const modules = NAV_ITEMS.filter(
    (item) =>
      item.to !== '/' &&
      item.to !== '/profil' &&
      item.to !== '/parametres' &&
      item.to !== '/objectifs' &&
      item.to !== '/encadrement' &&
      item.to !== '/livrables' &&
      item.to !== '/remarques',
  );

  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/inscription" element={<RegisterPage />} />
      <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
      <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />
      <Route path="/verifier-email" element={<VerifyEmailPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="these" element={<Navigate to="/profil" replace />} />
          <Route path="profil" element={<ProfilePage />} />
          <Route path="parametres" element={<SettingsPage />} />
          <Route path="objectifs" element={<DoctoralObjectivesPage />} />
          <Route path="objectifs/:objectiveId" element={<DoctoralObjectiveDetailPage />} />
          <Route path="livrables" element={<DeliverablesEntry />} />
          <Route
            path="livrables/:deliverableId"
            element={
              <Deferred>
                <DoctoralDeliverableDetailPage />
              </Deferred>
            }
          />
          <Route path="encadrement" element={<SupervisionPage />} />
          <Route path="encadrement/:thesisId" element={<SupervisorDossierPage />} />
          <Route
            path="encadrement/:thesisId/livrables"
            element={
              <Deferred>
                <SupervisorDeliverablesPage />
              </Deferred>
            }
          />
          <Route
            path="encadrement/:thesisId/livrables/:deliverableId"
            element={
              <Deferred>
                <SupervisorDeliverableDetailPage />
              </Deferred>
            }
          />
          <Route path="encadrement/:thesisId/objectifs" element={<SupervisorObjectivesPage />} />
          <Route
            path="encadrement/:thesisId/objectifs/:objectiveId"
            element={<SupervisorObjectiveDetailPage />}
          />
          <Route path="remarques" element={<DoctoralRemarksPage />} />
          <Route path="remarques/:remarkId" element={<DoctoralRemarkDetailPage />} />
          <Route path="encadrement/:thesisId/remarques" element={<SupervisorRemarksPage />} />
          <Route
            path="encadrement/:thesisId/remarques/:remarkId"
            element={<SupervisorRemarkDetailPage />}
          />
          {modules.map((item) => (
            <Route
              key={item.to}
              path={item.to.slice(1)}
              element={
                <ModulePage title={t(item.labelKey)} description={t(item.descriptionKey)} />
              }
            />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
