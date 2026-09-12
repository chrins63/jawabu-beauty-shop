import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { isOwnerRole } from '../lib/access';
import StaffProfilePage from './StaffProfilePage';
import './adminPages.css';

const ROLES = ['staff', 'manager', 'owner'];

function isPinSecret(value) {
  return /^\d{6,8}$/.test(String(value || '').trim());
}

function isValidStaffSecret(value) {
  const secret = String(value || '').trim();
  return isPinSecret(secret) || secret.length >= 8;
}

function randomStaffPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function functionError(error, data) {
  if (data?.error) {
    return String(data.error);
  }

  if (error?.context && typeof error.context.json === 'function') {
    return error.context
      .json()
      .then((body) => body?.error || error.message)
      .catch(() => error.message);
  }

  return error?.message || '';
}

function Staff() {
  const { profile } = useAuth();
  const isOwner = isOwnerRole(profile?.role);
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useParams();

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invite, setInvite] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'staff',
    pin: '',
  });
  const [resetMode, setResetMode] = useState('pin');
  const [resetSecret, setResetSecret] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    role: 'staff',
    active: true,
  });

  const resetRow = useMemo(() => {
    if (!userId) {
      return null;
    }

    return (
      staff.find((row) => String(row.user_id) === String(userId)) ||
      (location.state?.staff?.user_id === userId
        ? location.state.staff
        : null)
    );
  }, [userId, staff, location.state]);

  const fetchStaff = async () => {
    setLoading(true);
    setError('');

    const { data, error: loadError } = await supabase
      .from('staff_profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (loadError) {
      setError(loadError.message);
      setStaff([]);
    } else {
      setStaff(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    if (!userId) {
      setResetMode('pin');
      setResetSecret('');
      setResetConfirm('');
    }
  }, [userId]);

  useEffect(() => {
    if (!resetRow) {
      return;
    }

    setProfileForm({
      first_name: resetRow.first_name || '',
      last_name: resetRow.last_name || '',
      phone: resetRow.phone || '',
      role: resetRow.role || 'staff',
      active: resetRow.active !== false,
    });
  }, [resetRow]);

  const handleInviteChange = (event) => {
    const { name, value } = event.target;
    setInvite((current) => ({ ...current, [name]: value }));
    setError('');
    setSuccess('');
  };

  const handleInvite = async (event) => {
    event.preventDefault();

    if (!isOwner) {
      setError('Only the owner can invite staff.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const { data, error: inviteError } = await supabase.functions.invoke(
      'invite-staff',
      {
        body: {
          email: invite.email.trim().toLowerCase(),
          first_name: invite.first_name.trim(),
          last_name: invite.last_name.trim(),
          phone: invite.phone.trim(),
          role: invite.role,
          pin: invite.pin.trim(),
        },
      }
    );

    const message = await functionError(inviteError, data);

    if (inviteError || data?.error) {
      setError(message || 'Could not send the invite.');
      setSaving(false);
      return;
    }

    if (data?.emailed) {
      setSuccess(
        `Account created. A Sleek Sisters email with the login PIN was sent to ${invite.email.trim().toLowerCase()}.`
      );
    } else {
      setSuccess(
        `Account created for ${invite.email.trim().toLowerCase()}. The PIN email could not be sent: ${data?.warning || 'save the Sleek Sisters email account in Settings → Email.'}`
      );
    }

    setInvite({
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      role: 'staff',
      pin: '',
    });
    setSaving(false);
    fetchStaff();
  };

  const updateStaff = async (row, patch) => {
    if (!isOwner) {
      setError('Only the owner can change staff accounts.');
      return;
    }

    setError('');
    setSuccess('');

    const { error: updateError } = await supabase
      .from('staff_profiles')
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setStaff((current) =>
      current.map((item) =>
        item.id === row.id ? { ...item, ...patch } : item
      )
    );
    return true;
  };

  const saveProfile = async (event) => {
    event.preventDefault();

    if (!isOwner || !resetRow) {
      setError('Only the owner can edit a staff profile.');
      return;
    }

    const firstName = profileForm.first_name.trim();
    const lastName = profileForm.last_name.trim();

    if (!firstName || !lastName) {
      setError('First name and last name are required.');
      return;
    }

    const isSelf = resetRow.user_id === profile?.user_id;

    if (isSelf && profileForm.role !== resetRow.role) {
      setError('You cannot change your own role.');
      return;
    }

    if (isSelf && profileForm.active === false) {
      setError('You cannot deactivate your own account.');
      return;
    }

    const ownerCount = staff.filter((row) => row.role === 'owner').length;
    if (
      resetRow.role === 'owner' &&
      profileForm.role !== 'owner' &&
      ownerCount <= 1
    ) {
      setError('Keep at least one owner on the team.');
      return;
    }

    setSaving(true);
    const saved = await updateStaff(resetRow, {
      first_name: firstName,
      last_name: lastName,
      phone: profileForm.phone.trim(),
      role: profileForm.role,
      active: profileForm.active,
    });
    setSaving(false);

    if (saved) {
      setSuccess(`Saved ${firstName}'s role and profile.`);
    }
  };

  const openReset = (row) => {
    if (!isOwner) {
      setError('Only the owner can reset a staff login.');
      return;
    }

    if (!row?.user_id) {
      setError('That account cannot be reset yet.');
      return;
    }

    setError('');
    setSuccess('');
    setResetMode('pin');
    setResetSecret('');
    setResetConfirm('');
    navigate(`/staff/profile/${row.user_id}`, { state: { staff: row } });
  };

  const closeReset = () => {
    if (saving) {
      return;
    }

    setResetMode('pin');
    setResetSecret('');
    setResetConfirm('');
    navigate('/staff');
  };

  const fillGeneratedPin = () => {
    const pin = randomStaffPin();
    setResetMode('pin');
    setResetSecret(pin);
    setResetConfirm(pin);
    setError('');
  };

  const resetLogin = async (event) => {
    event.preventDefault();

    if (!isOwner || !resetRow) {
      setError('Only the owner can reset a staff login.');
      return;
    }

    const secret = resetSecret.trim();

    if (resetMode === 'pin' && !isPinSecret(secret)) {
      setError('Use a 6 to 8 digit PIN.');
      return;
    }

    if (resetMode === 'password' && secret.length < 8) {
      setError('Use a password of at least 8 characters.');
      return;
    }

    if (!isValidStaffSecret(secret)) {
      setError('Use a 6 to 8 digit PIN, or a password of at least 8 characters.');
      return;
    }

    if (secret !== resetConfirm.trim()) {
      setError('The two PINs or passwords do not match.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const { data, error: inviteError } = await supabase.functions.invoke(
      'invite-staff',
      {
        body: {
          user_id: resetRow.user_id,
          first_name: profileForm.first_name || resetRow.first_name || '',
          last_name: profileForm.last_name || resetRow.last_name || '',
          phone: profileForm.phone || resetRow.phone || '',
          role: profileForm.role || resetRow.role || 'staff',
          pin: secret,
          password: secret,
        },
      }
    );

    setSaving(false);

    const message = await functionError(inviteError, data);

    if (inviteError || data?.error) {
      setError(message || 'Could not reset that login.');
      return;
    }

    const label = isPinSecret(secret) ? 'PIN' : 'password';
    const emailed = Boolean(data?.emailed);
    const name = resetRow.first_name || 'that teammate';
    setResetMode('pin');
    setResetSecret('');
    setResetConfirm('');
    setSuccess(
      emailed
        ? `New ${label} emailed to ${name} from Sleek Sisters.`
        : `Login ${label} updated. Email was not sent: ${data?.warning || 'save SMTP in Settings → Email.'} Tell them the new ${label} yourself.`
    );
  };

  const removeStaff = async (row) => {
    if (!isOwner) {
      setError('Only the owner can remove staff.');
      return;
    }

    if (row.user_id === profile?.user_id) {
      setError('You cannot remove your own account.');
      return;
    }

    if (row.role === 'owner') {
      setError('The owner account cannot be removed.');
      return;
    }

    const name = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'this teammate';
    const confirmed = window.confirm(
      `Remove ${name} from the team? They will disappear from Staff and will not be able to sign in.`
    );

    if (!confirmed) {
      return;
    }

    setRemovingId(row.user_id);
    setError('');
    setSuccess('');

    const { data, error: removeError } = await supabase.functions.invoke(
      'invite-staff',
      {
        body: {
          action: 'remove',
          user_id: row.user_id,
        },
      }
    );

    let removed = Boolean(data?.removed);

    if (!removed) {
      const { error: deleteError } = await supabase
        .from('staff_profiles')
        .delete()
        .eq('id', row.id)
        .in('role', ['staff', 'manager']);

      if (deleteError) {
        setRemovingId('');
        const message = await functionError(removeError, data);
        setError(
          deleteError.message ||
            message ||
            'Could not remove that account.'
        );
        return;
      }

      removed = true;
    }

    setRemovingId('');
    setStaff((current) => current.filter((item) => item.user_id !== row.user_id));
    setSuccess(`${data?.name || name} has been removed from the team.`);
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>{resetRow ? 'Edit profile' : 'Staff'}</h1>
          <p>
            {resetRow
              ? `Update the role and profile for ${resetRow.first_name || 'this teammate'}, then reset their PIN or password.`
              : 'Assign a default PIN, then they get it from the Sleek Sisters email and can sign in with email or phone. Click Reset PIN to edit their role and profile.'}
          </p>
        </div>
        {resetRow ? (
          <button
            type="button"
            className="admin-ghost-button"
            onClick={closeReset}
            disabled={saving}
          >
            Back to team
          </button>
        ) : (
          <button type="button" className="admin-ghost-button" onClick={fetchStaff}>
            Refresh
          </button>
        )}
      </div>

      {error && <div className="admin-page-message error">{error}</div>}
      {success && <div className="admin-page-message success">{success}</div>}

      {userId && !loading && !resetRow && (
        <div className="admin-page-message error">
          That staff account was not found. Go back to the team list and try
          again.
        </div>
      )}

      {resetRow ? (
        <StaffProfilePage
          person={resetRow}
          profileForm={profileForm}
          isSelf={resetRow.user_id === profile?.user_id}
          mode={resetMode}
          secret={resetSecret}
          confirm={resetConfirm}
          saving={saving}
          onProfileChange={(name, value) => {
            setProfileForm((current) => ({ ...current, [name]: value }));
            setError('');
          }}
          onSaveProfile={saveProfile}
          onModeChange={(next) => {
            setResetMode(next);
            setResetSecret('');
            setResetConfirm('');
            setError('');
          }}
          onSecretChange={(value) => {
            setResetSecret(value);
            setError('');
          }}
          onConfirmChange={(value) => {
            setResetConfirm(value);
            setError('');
          }}
          onGeneratePin={fillGeneratedPin}
          onCancel={closeReset}
          onResetLogin={resetLogin}
        />
      ) : (
        <>
          {isOwner && (
            <section className="admin-page-card">
              <h2>Add staff</h2>
              <p className="hint">
                Assign a default login PIN. They get it from the Sleek Sisters
                email account, not from Supabase, and can sign in with email or
                phone.
              </p>

              <form className="admin-form-grid" onSubmit={handleInvite}>
                <div className="admin-field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={invite.email}
                    onChange={handleInviteChange}
                    required
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="first_name">First name</label>
                  <input
                    id="first_name"
                    name="first_name"
                    value={invite.first_name}
                    onChange={handleInviteChange}
                    required
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="last_name">Last name</label>
                  <input
                    id="last_name"
                    name="last_name"
                    value={invite.last_name}
                    onChange={handleInviteChange}
                    required
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    name="phone"
                    value={invite.phone}
                    onChange={handleInviteChange}
                    placeholder="0143074416"
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="role">Role</label>
                  <select
                    id="role"
                    name="role"
                    value={invite.role}
                    onChange={handleInviteChange}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-field">
                  <label htmlFor="pin">Login PIN</label>
                  <input
                    id="pin"
                    name="pin"
                    type="text"
                    inputMode="numeric"
                    value={invite.pin}
                    onChange={handleInviteChange}
                    placeholder="6 to 8 digits"
                    required
                  />
                </div>
                <button type="submit" className="admin-gold-button" disabled={saving}>
                  {saving ? 'Saving...' : 'Create and email PIN'}
                </button>
              </form>
            </section>
          )}

          <section className="admin-page-card">
            <h2>Team</h2>
            <p className="hint">
              {loading
                ? 'Loading staff...'
                : `${staff.length} account${staff.length === 1 ? '' : 's'}. Remove takes a staff member or manager off the team so they cannot sign in.`}
            </p>

            {loading ? (
              <div className="admin-empty">Loading...</div>
            ) : staff.length === 0 ? (
              <div className="admin-empty">
                No staff profiles are visible for this account.
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Status</th>
                      {isOwner && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((row) => {
                      const isSelf = row.user_id === profile?.user_id;

                      return (
                        <tr key={row.id || row.user_id}>
                          <td>
                            <strong>
                              {row.first_name} {row.last_name}
                            </strong>
                            {isSelf ? ' (you)' : ''}
                          </td>
                          <td>{row.phone || '—'}</td>
                          <td>
                            {isOwner && !isSelf ? (
                              <select
                                value={row.role}
                                onChange={(event) =>
                                  updateStaff(row, { role: event.target.value })
                                }
                              >
                                {ROLES.map((role) => (
                                  <option key={role} value={role}>
                                    {role}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="admin-badge gold">{row.role}</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`admin-badge ${row.active ? 'ok' : 'off'}`}
                            >
                              {row.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          {isOwner && (
                            <td>
                              <div className="admin-row-actions">
                                <button
                                  type="button"
                                  className={
                                    row.active
                                      ? 'admin-ghost-button'
                                      : 'admin-gold-button'
                                  }
                                  disabled={isSelf}
                                  onClick={() =>
                                    updateStaff(row, { active: !row.active })
                                  }
                                >
                                  {row.active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  type="button"
                                  className="admin-gold-button"
                                  onClick={() => openReset(row)}
                                >
                                  Reset PIN
                                </button>
                                <button
                                  type="button"
                                  className="admin-danger-button"
                                  disabled={
                                    isSelf ||
                                    row.role === 'owner' ||
                                    removingId === row.user_id
                                  }
                                  onClick={() => removeStaff(row)}
                                >
                                  {removingId === row.user_id
                                    ? 'Removing…'
                                    : 'Remove'}
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default Staff;
