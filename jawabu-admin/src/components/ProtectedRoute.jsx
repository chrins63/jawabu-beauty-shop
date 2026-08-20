import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const {
    user,
    profile,
    isLoading,
  } = useAuth();

  // Still checking authentication/profile
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Arial, sans-serif',
          background: '#faf7f4',
          color: '#222',
        }}
      >
        Loading...
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // No staff profile
  if (!profile) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#faf7f4',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            background: '#fff',
            padding: '50px',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            textAlign: 'center',
            maxWidth: '500px',
          }}
        >
          <h1 style={{ color: '#d62828' }}>
            Access Denied
          </h1>

          <p>
            Your account does not have a staff profile.
          </p>

          <button
            onClick={() => {
              window.location.href = '/login';
            }}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              background: '#111',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Staff account is disabled
  if (profile.active !== true) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#faf7f4',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            background: '#fff',
            padding: '50px',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            textAlign: 'center',
            maxWidth: '500px',
          }}
        >
          <h1 style={{ color: '#d62828' }}>
            Account Inactive
          </h1>

          <p>
            Your staff account has been deactivated.
          </p>

          <button
            onClick={() => {
              window.location.href = '/login';
            }}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              background: '#111',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Check role permissions
  const currentRole = String(profile.role || '').toLowerCase()
  const permitted = (allowedRoles || []).map((role) =>
    String(role).toLowerCase()
  )

  if (
    permitted.length > 0 &&
    !permitted.includes(currentRole)
  ) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#faf7f4',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            background: '#fff',
            padding: '50px',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            textAlign: 'center',
            maxWidth: '500px',
          }}
        >
          <h1 style={{ color: '#d62828' }}>
            Unauthorized
          </h1>

          <p>
            Your role does not have permission to view this page.
          </p>

          <p
            style={{
              marginTop: '15px',
              fontSize: '14px',
              color: '#777',
            }}
          >
            Current role: <strong>{profile.role}</strong>
          </p>

          <button
            onClick={() => {
              window.location.href = '/login';
            }}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              background: '#111',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;