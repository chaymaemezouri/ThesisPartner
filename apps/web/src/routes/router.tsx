import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
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
  DoctoralMeetingDetailPage,
  DoctoralMeetingsPage,
} from '../features/meetings/DoctoralMeetingsPage';
import {
  SupervisorMeetingDetailPage,
  SupervisorMeetingsPage,
} from '../features/meetings/SupervisorMeetingsPage';
import {
  DoctoralRemarkDetailPage,
  DoctoralRemarksPage,
} from '../features/remarks/DoctoralRemarksPage';
import {
  SupervisorRemarkDetailPage,
  SupervisorRemarksPage,
} from '../features/remarks/SupervisorRemarksPage';
import { SupervisionPage } from '../features/supervision/SupervisionPage';
import { StudentProfilePage } from '../features/supervision/StudentProfilePage';
import { SupervisorDossierPage } from '../features/supervision/SupervisorDossierPage';
import { SupervisorDeliverablesIndex } from '../features/supervision/SupervisorDeliverablesIndex';
import { SupervisorMeetingsIndex } from '../features/supervision/SupervisorMeetingsIndex';
import { useSupervisedTheses } from '../features/supervision/hooks/use-supervised-theses';
import { MessagesPage } from '../features/messages/MessagesPage';
import { PortfolioPage } from '../features/portfolio/PortfolioPage';
import { ResearchAiPage } from '../features/research-ai/ResearchAiPage';
import { ResourcesPage } from '../features/resources/ResourcesPage';
import { SupervisorDeskPage } from '../features/supervision/SupervisorDeskPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ModulePage } from '../pages/ModulePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { AdminShell } from '../features/admin/AdminShell';
import { AdminAnalyticsPage } from '../features/admin/AdminAnalyticsPage';
import { AdminAuditPage } from '../features/admin/AdminAuditPage';
import { AdminDashboardPage } from '../features/admin/AdminDashboardPage';
import { AdminInvitationsPage } from '../features/admin/AdminInvitationsPage';
import { AdminSystemPage } from '../features/admin/AdminSystemPage';
import { AdminThesisRelationsPage } from '../features/admin/AdminThesisRelationsPage';
import { AdminUserDetailPage } from '../features/admin/AdminUserDetailPage';
import { AdminUsersPage } from '../features/admin/AdminUsersPage';
import { RequireSuperAdmin } from '../features/admin/RequireSuperAdmin';
import { InvitationRespondPage } from '../features/invitations/InvitationRespondPage';
import { InvitationsInboxPage } from '../features/invitations/InvitationsInboxPage';
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

function MeetingsEntry() {
  const supervised = useSupervisedTheses();
  if ((supervised.data?.theses.length ?? 0) > 0) return <SupervisorMeetingsIndex />;
  return <DoctoralMeetingsPage />;
}

function StudentThesisRedirect() {
  const params = useParams();
  return <Navigate to={`/encadrement/${params.thesisId}/profil`} replace />;
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
      item.to !== '/remarques' &&
      item.to !== '/reunions' &&
      item.to !== '/portfolio' &&
      item.to !== '/messagerie' &&
      item.to !== '/ressources' &&
      item.to !== '/radar',
  );

  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/inscription" element={<RegisterPage />} />
      <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
      <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />
      <Route path="/verifier-email" element={<VerifyEmailPage />} />
      <Route path="/invitation" element={<InvitationRespondPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<RequireSuperAdmin />}>
          <Route path="admin" element={<AdminShell />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="utilisateurs" element={<AdminUsersPage />} />
            <Route path="utilisateurs/:userId" element={<AdminUserDetailPage />} />
            <Route path="invitations" element={<AdminInvitationsPage />} />
            <Route path="theses/:thesisId" element={<AdminThesisRelationsPage />} />
            <Route path="audit" element={<AdminAuditPage />} />
            <Route path="system" element={<AdminSystemPage />} />
          </Route>
        </Route>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="these" element={<Navigate to="/profil" replace />} />
          <Route path="profil" element={<ProfilePage />} />
          <Route path="parametres" element={<SettingsPage />} />
          <Route path="invitations" element={<InvitationsInboxPage />} />
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
          <Route path="encadrement/:thesisId/these" element={<StudentThesisRedirect />} />
          <Route path="encadrement/:thesisId/profil" element={<StudentProfilePage />} />
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
          <Route path="portfolio" element={<PortfolioPage />} />
          <Route path="ressources" element={<ResourcesPage />} />
          <Route path="radar" element={<ResearchAiPage />} />
          <Route path="suivi" element={<SupervisorDeskPage />} />
          <Route path="messagerie" element={<MessagesPage />} />
          <Route path="messagerie/:conversationId" element={<MessagesPage />} />
          <Route path="reunions" element={<MeetingsEntry />} />
          <Route path="reunions/:meetingId" element={<DoctoralMeetingDetailPage />} />
          <Route path="encadrement/:thesisId/reunions" element={<SupervisorMeetingsPage />} />
          <Route
            path="encadrement/:thesisId/reunions/:meetingId"
            element={<SupervisorMeetingDetailPage />}
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
              element={<ModulePage title={t(item.labelKey)} />}
            />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
