import { useAuth } from '../context/AuthContext';

function Topbar() {
  const { user, profile, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="topbar">

      <div>
        <h1>Jawabu Beauty Admin</h1>
      </div>

      <div className="topbar-right">

        <div className="user-info">

          <strong>
            {profile?.first_name || 'Admin'}{' '}
            {profile?.last_name || ''}
          </strong>

          <span>
            {user?.email}
          </span>

          <small>
            {profile?.role || 'Staff'}
          </small>

        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>

      </div>

    </header>
  );
}

export default Topbar;