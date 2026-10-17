/**
 * Route table for the app. Kept separate from App.tsx so tests can build
 * in-memory routers without instantiating the browser router.
 */
import type { RouteObject } from 'react-router-dom';
import PageLoader from './components/PageLoader';
import RouteError from './components/RouteError';

export const routes: RouteObject[] = [
  {
    path: '/',
    errorElement: <RouteError />,
    HydrateFallback: () => <PageLoader />,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('./pages/LandingPage')).default }),
      },
      {
        path: 'customer',
        lazy: async () => ({ Component: (await import('./pages/CustomerEntry')).default }),
      },
      {
        path: 'astrologer',
        lazy: async () => ({ Component: (await import('./pages/AstrologerEntry')).default }),
      },
      {
        path: 'admin',
        lazy: async () => ({ Component: (await import('./pages/AdminEntry')).default }),
      },
      {
        path: '*',
        lazy: async () => ({ Component: (await import('./pages/NotFound')).default }),
      },
    ],
  },
];