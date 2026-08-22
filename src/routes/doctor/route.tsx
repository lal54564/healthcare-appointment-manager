import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AppLayout } from '../../components/layout/AppLayout';

export const Route = createFileRoute('/doctor')({ 
  component: DoctorLayout,
});

function DoctorLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
