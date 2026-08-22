import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AppLayout } from '../../components/layout/AppLayout';
// import { useAuth } from '../../context/AuthContext'; // adjust path as needed

export const Route = createFileRoute('/patient')({ 
  component: PatientLayout,
});

function PatientLayout() {
  // const { user, isAuthenticated } = useAuth();
  
  // if (!isAuthenticated || user?.role !== 'patient') {
  //   return <Navigate to="/login" />;
  // }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
