import { createRootRoute, Outlet, HeadContent, Scripts } from '@tanstack/react-router';
import { AuthProvider } from '../context/AuthContext';
import { Toaster } from 'react-hot-toast';
import appCss from '../styles/app.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Healthcare Appointment Manager' },
      { name: 'description', content: 'Book appointments, manage your health, connect with doctors' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap' },
    ],
  }),
  component: RootComponent,
  notFoundComponent: () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#f1f5f9' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 700, margin: 0 }}>404</h1>
      <p style={{ fontSize: '1.25rem', color: '#94a3b8', margin: '8px 0 24px' }}>Page not found</p>
      <a href="/" style={{ background: '#14b8a0', color: '#0f172a', padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>Go Home</a>
    </div>
  ),
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased text-surface-900 bg-surface-50">
        <AuthProvider>
          <Outlet />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#f1f5f9',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: {
                iconTheme: { primary: '#14b8a0', secondary: '#f0fdf9' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#fef2f2' },
              },
            }}
          />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
