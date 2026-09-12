import { useEffect, useRef } from 'react';
import { publicAsset } from '../lib/assets';

const ROLES = ['staff', 'manager', 'owner'];

export default function StaffProfilePage({
  person,
  profileForm,
  isSelf,
  mode,
  secret,
  confirm,
  saving,
  onProfileChange,
  onSaveProfile,
  onModeChange,
  onSecretChange,
  onConfirmChange,
  onGeneratePin,
  onCancel,
  onResetLogin,
}) {
  const inputRef = useRef(null);
  const firstName = person?.first_name || 'this';
  const lastName = person?.last_name || 'teammate';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [person?.user_id]);

  return (
    <section className="staff-reset-board">
      <div className="staff-reset-brand">
        <img
          src={publicAsset('images/brand/logo-mark.png')}
          alt="Sleek Sisters"
        />
        <strong>Sleek_Sisters</strong>
        <em>Grace in Every Detail</em>
      </div>

      <h2>
        Edit profile for {firstName} {lastName}
      </h2>
      <p>
        Change their name, phone, and role, then reset the PIN or password they
        use to sign in.
      </p>

      <form className="staff-reset-form" onSubmit={onSaveProfile}>
        <div className="staff-reset-options staff-profile-fields">
          <div className="admin-field">
            <label htmlFor="profile-first-name">First name</label>
            <input
              id="profile-first-name"
              ref={inputRef}
              type="text"
              value={profileForm.first_name}
              onChange={(event) =>
                onProfileChange('first_name', event.target.value)
              }
              required
              disabled={saving}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="profile-last-name">Last name</label>
            <input
              id="profile-last-name"
              type="text"
              value={profileForm.last_name}
              onChange={(event) =>
                onProfileChange('last_name', event.target.value)
              }
              required
              disabled={saving}
            />
          </div>
        </div>

        <div className="staff-reset-options staff-profile-fields">
          <div className="admin-field">
            <label htmlFor="profile-phone">Phone</label>
            <input
              id="profile-phone"
              type="tel"
              value={profileForm.phone}
              onChange={(event) =>
                onProfileChange('phone', event.target.value)
              }
              placeholder="0143074416"
              disabled={saving}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="profile-role">Role</label>
            <select
              id="profile-role"
              value={profileForm.role}
              onChange={(event) => onProfileChange('role', event.target.value)}
              disabled={saving || isSelf}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-field">
          <label htmlFor="profile-active">Account status</label>
          <select
            id="profile-active"
            value={profileForm.active ? 'active' : 'inactive'}
            onChange={(event) =>
              onProfileChange('active', event.target.value === 'active')
            }
            disabled={saving || isSelf}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {isSelf && (
          <p className="staff-profile-note">
            You cannot change your own role or deactivate your own account.
          </p>
        )}

        <div className="staff-reset-actions">
          <button
            type="button"
            className="admin-ghost-button"
            onClick={onCancel}
            disabled={saving}
          >
            Back to team
          </button>
          <button
            type="submit"
            className="admin-gold-button"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>

      <div className="staff-profile-login">
        <h3>Reset login</h3>
        <p>They can sign in with this PIN or password immediately.</p>

        <div className="staff-reset-options">
          <button
            type="button"
            className={`staff-reset-option${mode === 'pin' ? ' is-active' : ''}`}
            onClick={() => onModeChange('pin')}
            disabled={saving}
          >
            <strong>Staff PIN</strong>
            <span>6 to 8 digits, same as the till login</span>
          </button>
          <button
            type="button"
            className={`staff-reset-option${mode === 'password' ? ' is-active' : ''}`}
            onClick={() => onModeChange('password')}
            disabled={saving}
          >
            <strong>Password</strong>
            <span>8 or more characters, for a full login</span>
          </button>
        </div>

        <form className="staff-reset-form" onSubmit={onResetLogin}>
          <div className="admin-field">
            <label htmlFor="reset-secret">
              {mode === 'pin' ? 'New PIN' : 'New password'}
            </label>
            <input
              id="reset-secret"
              type="text"
              inputMode={mode === 'pin' ? 'numeric' : 'text'}
              autoComplete="new-password"
              value={secret}
              onChange={(event) => onSecretChange(event.target.value)}
              placeholder={
                mode === 'pin' ? '6 to 8 digits' : 'At least 8 characters'
              }
              required
              disabled={saving}
            />
          </div>

          <div className="admin-field">
            <label htmlFor="reset-confirm">Confirm</label>
            <input
              id="reset-confirm"
              type="text"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => onConfirmChange(event.target.value)}
              placeholder="Type it again"
              required
              disabled={saving}
            />
          </div>

          <div className="staff-reset-actions">
            {mode === 'pin' && (
              <button
                type="button"
                className="admin-ghost-button"
                onClick={onGeneratePin}
                disabled={saving}
              >
                Generate PIN
              </button>
            )}
            <button
              type="submit"
              className="admin-gold-button"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save login and email'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
