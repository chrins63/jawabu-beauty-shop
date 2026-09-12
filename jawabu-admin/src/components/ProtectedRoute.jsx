import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessPath } from '../lib/access';

const ProtectedRoute = ({ allowedRoles }) => {
  const {
    user,
    profile,
    isLoading,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
            onClick={() => navigate('/login', { replace: true })}
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
            onClick={() => navigate('/login', { replace: true })}
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
  const roleAllowed =
    permitted.length === 0 || permitted.includes(currentRole)
  const pathAllowed = canAccessPath(currentRole, location.pathname)

  if (!roleAllowed || !pathAllowed) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            background: '#111111',
            padding: '40px',
            borderRadius: '4px',
            border: '1px solid rgba(201, 168, 118, 0.35)',
            textAlign: 'center',
            maxWidth: '460px',
            color: '#f5ead0',
          }}
        >
          <h1 style={{ color: '#c9a876', fontSize: '28px', marginTop: 0 }}>
            Restricted
          </h1>

          <p>
            Your role cannot open this page.
          </p>

          <p
            style={{
              marginTop: '15px',
              fontSize: '14px',
              color: '#c9a876',
            }}
          >
            Signed in as <strong>{profile.role}</strong>
          </p>

          <button
            onClick={() => navigate('/', { replace: true })}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              background: '#c9a876',
              color: '#0a0a0a',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;