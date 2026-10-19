/**
 * Route table for the app. Kept separate from App.tsx so tests can build
 * in-memory routers without instantiating the browser router.
 */
import type { ReactNode } from 'react';
import { Outlet, type RouteObject } from 'react-router-dom';
import PageLoader from './components/PageLoader';
import RouteError from './components/RouteError';
import { AuthRoute } from './components/AuthRoute';
import { AuthProvider } from './auth/AuthProvider';

/**
 * The session provider lives above every route, so guards can read auth state
 * without depending on anything rendered below them.
 */
function RootRoute(): ReactNode {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootRoute />,
    errorElement: <RouteError />,
    HydrateFallback: () => <PageLoader />,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('./pages/LandingPage')).default }),
      },
      {
        path: 'customer',
        lazy: async () => {
          const { default: CustomerEntry } = await import('./pages/CustomerEntry');
          return {
            Component: function CustomerRoute() {
              return (
                <AuthRoute>
                  <CustomerEntry />
                </AuthRoute>
              );
            },
          };
        },
      },
      {
        path: 'astrologer',
        lazy: async () => {
          const { default: AstrologerEntry } = await import('./pages/AstrologerEntry');
          return {
            Component: function AstrologerRoute() {
              return (
                <AuthRoute require="astrologer">
                  <AstrologerEntry />
                </AuthRoute>
              );
            },
          };
        },
      },
      {
        path: 'admin',
        lazy: async () => {
          const { default: AdminEntry } = await import('./pages/AdminEntry');
          return {
            Component: function AdminRoute() {
              return (
                <AuthRoute require="admin">
                  <AdminEntry />
                </AuthRoute>
              );
            },
          };
        },
      },
      {
        path: 'login',
        lazy: async () => ({ Component: (await import('./pages/LoginPage')).default }),
      },
      {
        path: 'register',
        lazy: async () => ({ Component: (await import('./pages/RegisterPage')).default }),
      },
      {
        path: '*',
        lazy: async () => ({ Component: (await import('./pages/NotFound')).default }),
      },
    ],
  },
];
