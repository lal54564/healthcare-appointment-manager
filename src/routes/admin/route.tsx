import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AppLayout } from '../../components/layout/AppLayout';

export const Route = createFileRoute('/admin')({ 
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
