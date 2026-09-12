import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./Login.css";

const VIDEO_SRC = "/assets/video/jawabu-hero-loop.mp4";
const POSTER_SRC = "/assets/video/jawabu-hero-poster.jpg";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [videoOk, setVideoOk] = useState(true);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setSubmitting(true);

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo }
    );

    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage(
      "If that email is registered, we sent a reset link. Check your inbox."
    );
  };

  return (
    <div className="jw-root -stage1 -stage2 -stage3">
      <div className="jw-media">
        {videoOk ? (
          <video
            className="jw-video"
            src={VIDEO_SRC}
            poster={POSTER_SRC}
            autoPlay
            loop
            muted
            playsInline
            onError={() => setVideoOk(false)}
          />
        ) : (
          <div className="jw-fallback" />
        )}
        <div className="jw-grain" />
        <div className="jw-scrim" />
      </div>

      <div className="jw-nav">
        <Link to="/" className="jw-wordmark" style={{ textDecoration: "none" }}>
          SLEEK
        </Link>
        <Link to="/login" className="jw-nav-tag">
          Back to sign in
        </Link>
      </div>

      <div className="jw-stagearea">
        <form className="jw-card" onSubmit={handleSubmit}>
          <div className="jw-eyebrow">Account</div>
          <h1 className="jw-title">
            Forgot
            <span className="jw-script"> password</span>
          </h1>
          <p className="jw-sub">
            Enter the email on your Sleek Sisters account and we will send a reset link.
          </p>

          {errorMessage && (
            <div className="jw-error" role="alert">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <p className="jw-sub" role="status">
              {successMessage}
            </p>
          )}

          <div className={`jw-field${email ? " -active" : ""}`}>
            <input
              type="email"
              placeholder=" "
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <label>Email address</label>
          </div>

          <button className="jw-btn" type="submit" disabled={submitting}>
            <span className="jw-btn-label">
              {submitting ? "Sending..." : "Send reset link"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
