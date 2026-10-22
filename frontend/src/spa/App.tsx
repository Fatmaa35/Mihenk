import { lazy, ReactNode, Suspense } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { createQueryClient } from '../shared/api/queries'
import { Spinner, ToastProvider } from '../shared/ui'
import { ThemeProvider } from './theme/ThemeProvider'
import { AppShell } from './layout/AppShell'
import { RequireSession, RedirectIfSignedIn } from './layout/SessionGate'
import { RouteError } from './layout/RouteError'
import { routes } from './routes'

const SignInPage = lazy(() => import('./pages/SignInPage'))
const TodayPage = lazy(() => import('./pages/TodayPage'))
const DiscoverPage = lazy(() => import('./pages/DiscoverPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))
const ClubsPage = lazy(() => import('./pages/ClubsPage'))
const FocusPage = lazy(() => import('./pages/FocusPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

const page = (element: ReactNode) => <Suspense fallback={<Spinner />}>{element}</Suspense>

const router = createBrowserRouter([
  { path: routes.signIn, element: <RedirectIfSignedIn>{page(<SignInPage />)}</RedirectIfSignedIn>, errorElement: <RouteError /> },
  {
    element: <RequireSession><AppShell /></RequireSession>,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Navigate to={routes.today} replace /> },
      { path: routes.today, element: page(<TodayPage />) },
      { path: routes.discover, element: page(<DiscoverPage />) },
      { path: routes.library, element: page(<LibraryPage />) },
      { path: routes.clubs, element: page(<ClubsPage />) },
      { path: routes.focus, element: page(<FocusPage />) },
      { path: '*', element: page(<NotFoundPage />) },
    ],
  },
])

const queryClient = createQueryClient()

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
