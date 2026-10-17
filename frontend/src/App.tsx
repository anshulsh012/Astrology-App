import { Suspense, type ReactNode } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import PageLoader from './components/PageLoader';
import { routes } from './routes';

export const router = createBrowserRouter(routes);

export default function App(): ReactNode {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <RouterProvider router={router} />
      </Suspense>
    </ErrorBoundary>
  );
}