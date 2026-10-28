import { BookOpen, CalendarCheck, GraduationCap, LayoutDashboard, Settings, UserCog, Users } from 'lucide-react';
import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { SiteLayout } from './components/layout/SiteLayout';
import { DashboardRedirect, ProtectedRoute } from './components/ProtectedRoute';
import { LoadingState } from './components/ui/Feedback';
import { AuthProvider } from './context/AuthContext';
import HomePage from './pages/HomePage';
import { AboutPage, ContactPage, NotFoundPage, PrivacyPage, TermsPage } from './pages/info/InfoPages';

const TutorsPage = lazy(() => import('./pages/TutorsPage'));
const TutorProfilePage = lazy(() => import('./pages/TutorProfilePage'));
const LoginPage = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.RegisterPage })));
const AccountSettingsPage = lazy(() => import('./pages/AccountSettingsPage'));
const StudentBookingsPage = lazy(() => import('./pages/student/StudentBookingsPage'));
const TutorOverviewPage = lazy(() => import('./pages/tutor/TutorPages').then((m) => ({ default: m.TutorOverviewPage })));
const TutorProfileEditPage = lazy(() => import('./pages/tutor/TutorPages').then((m) => ({ default: m.TutorProfileEditPage })));
const AdminOverviewPage = lazy(() => import('./pages/admin/AdminOverviewPage'));
const AdminTutorsPage = lazy(() => import('./pages/admin/AdminTutorsPage'));
const AdminTutorEditPage = lazy(() => import('./pages/admin/AdminTutorEditPage'));
const AdminStudentsPage = lazy(() => import('./pages/admin/AdminStudentsPage'));
const AdminSubjectsPage = lazy(() => import('./pages/admin/AdminSubjectsPage'));
const AdminBookingsPage = lazy(() => import('./pages/admin/AdminBookingsPage'));

const s = (el: ReactNode) => <Suspense fallback={<LoadingState />}>{el}</Suspense>;

const routes: RouteObject[] = [
  {
    element: <SiteLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'tutors', element: s(<TutorsPage />) },
      { path: 'tutors/:id', element: s(<TutorProfilePage />) },
      { path: 'login', element: s(<LoginPage />) },
      { path: 'register', element: s(<RegisterPage />) },
      { path: 'about', element: <AboutPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'terms', element: <TermsPage /> },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <DashboardRedirect>
              <ProtectedRoute roles={['student']}>
                <DashboardLayout
                  title="Student"
                  nav={[
                    { to: '/dashboard', label: 'My bookings', icon: CalendarCheck, end: true },
                    { to: '/dashboard/account', label: 'Account', icon: Settings },
                  ]}
                />
              </ProtectedRoute>
            </DashboardRedirect>
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: s(<StudentBookingsPage />) },
          { path: 'account', element: s(<AccountSettingsPage />) },
        ],
      },
      {
        path: 'tutor',
        element: (
          <ProtectedRoute roles={['tutor']}>
            <DashboardLayout
              title="Tutor panel"
              nav={[
                { to: '/tutor', label: 'Overview & bookings', icon: LayoutDashboard, end: true },
                { to: '/tutor/profile', label: 'My profile', icon: UserCog },
                { to: '/tutor/account', label: 'Account', icon: Settings },
              ]}
            />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: s(<TutorOverviewPage />) },
          { path: 'profile', element: s(<TutorProfileEditPage />) },
          { path: 'account', element: s(<AccountSettingsPage />) },
        ],
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute roles={['admin']}>
            <DashboardLayout
              title="Admin CRM"
              nav={[
                { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
                { to: '/admin/tutors', label: 'Tutors', icon: GraduationCap },
                { to: '/admin/students', label: 'Students', icon: Users },
                { to: '/admin/subjects', label: 'Subjects', icon: BookOpen },
                { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
              ]}
            />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: s(<AdminOverviewPage />) },
          { path: 'tutors', element: s(<AdminTutorsPage />) },
          { path: 'tutors/:id', element: s(<AdminTutorEditPage />) },
          { path: 'students', element: s(<AdminStudentsPage />) },
          { path: 'subjects', element: s(<AdminSubjectsPage />) },
          { path: 'bookings', element: s(<AdminBookingsPage />) },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

const router = createBrowserRouter(routes);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
