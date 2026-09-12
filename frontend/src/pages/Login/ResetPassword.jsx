import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./Login.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (password.length < 8) {
      setErrorMessage("Use at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });

    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    navigate("/account", { replace: true });
  };

  return (
    <div className="jw-root -stage1 -stage2 -stage3">
      <div className="jw-nav">
        <Link to="/" className="jw-wordmark" style={{ textDecoration: "none" }}>
          SLEEK
        </Link>
      </div>

      <div className="jw-stagearea">
        <form className="jw-card" onSubmit={handleSubmit}>
          <div className="jw-eyebrow">Account</div>
          <h1 className="jw-title">
            New
            <span className="jw-script"> password</span>
          </h1>

          {!ready && (
            <p className="jw-sub">
              Open this page from the reset link in your email.
            </p>
          )}

          {errorMessage && (
            <div className="jw-error" role="alert">
              {errorMessage}
            </div>
          )}

          <div className={`jw-field${password ? " -active" : ""}`}>
            <input
              type="password"
              placeholder=" "
              value={password}
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={!ready}
            />
            <label>New password</label>
          </div>

          <div className={`jw-field${confirm ? " -active" : ""}`}>
            <input
              type="password"
              placeholder=" "
              value={confirm}
              autoComplete="new-password"
              onChange={(event) => setConfirm(event.target.value)}
              required
              disabled={!ready}
            />
            <label>Confirm password</label>
          </div>

          <button
            className="jw-btn"
            type="submit"
            disabled={submitting || !ready}
          >
            <span className="jw-btn-label">
              {submitting ? "Saving..." : "Update password"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
