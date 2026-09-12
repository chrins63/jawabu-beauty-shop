
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./Login.css";

const VIDEO_SRC = "/assets/video/jawabu-hero-loop.mp4";
const POSTER_SRC = "/assets/video/jawabu-hero-poster.jpg";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [videoOk, setVideoOk] = useState(true);
  const [stage, setStage] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 80),
      setTimeout(() => setStage(2), 700),
      setTimeout(() => setStage(3), 1150),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorMessage("");
    setSubmitting(true);

    const cleanEmail = email.trim();

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      console.error("Login error:", error);

      setErrorMessage(
        error.message || "Unable to sign in. Please check your details."
      );

      setSubmitting(false);
      return;
    }

    // Successful login
    setSubmitting(false);

    navigate("/account", { replace: true });
  };

  return (
    <div
      className={`jw-root${stage >= 1 ? " -stage1" : ""}${
        stage >= 2 ? " -stage2" : ""
      }${stage >= 3 ? " -stage3" : ""}`}
    >
      {/* Background media */}
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
            preload="auto"
            onError={() => setVideoOk(false)}
          />
        ) : (
          <div className="jw-fallback" />
        )}

        <div className="jw-grain" />
        <div className="jw-scrim" />
      </div>

      {/* Cinematic letterbox */}
      <div className="jw-bar top" />
      <div className="jw-bar bottom" />

      {/* Left caption */}
      <div className="jw-caption">
        <span className="eyebrow">The Sleek Edit</span>

        <p>
          Look good.
          <br />
          <span className="jw-script">
            Stay sleek.
          </span>
        </p>
      </div>

      {/* Login form */}
      <div className="jw-stagearea">
        <form
          className="jw-card"
          onSubmit={handleSubmit}
        >
          <div className="jw-eyebrow">
            Welcome back
          </div>

          <h1 className="jw-title">
            Sign in
            <span className="jw-script">
              , beautifully.
            </span>
          </h1>

          {/* Create account */}
          <p className="jw-sub">
            New here?{" "}
            <Link
              className="jw-create-account"
              to="/register"
            >
              Create an account
            </Link>
          </p>

          {/* Login error */}
          {errorMessage && (
            <div
              className="jw-error"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          {/* Email */}
          <div
            className={`jw-field${
              focused === "email" || email
                ? " -active"
                : ""
            }`}
          >
            <input
              type="email"
              placeholder=" "
              value={email}
              autoComplete="email"
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage("");
              }}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              required
            />

            <label>
              Email address
            </label>
          </div>

          {/* Password */}
          <div
            className={`jw-field${
              focused === "password" || password
                ? " -active"
                : ""
            }`}
          >
            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder=" "
              value={password}
              autoComplete="current-password"
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMessage("");
              }}
              onFocus={() =>
                setFocused("password")
              }
              onBlur={() =>
                setFocused(null)
              }
              required
            />

            <label>
              Password
            </label>

            <button
              type="button"
              className="jw-toggle"
              onClick={() =>
                setShowPassword((s) => !s)
              }
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword
                ? "HIDE"
                : "SHOW"}
            </button>
          </div>

          {/* Remember / Forgot */}
          <div className="jw-row">
            <Link
              className="jw-forgot"
              to="/forgot-password"
            >
              Forgot password?
            </Link>
          </div>

          {/* Login button */}
          <button
            className="jw-btn"
            type="submit"
            disabled={submitting}
          >
            <span className="jw-btn-label">
              {submitting && (
                <span className="jw-spinner" />
              )}

              {submitting
                ? "Signing in..."
                : "Sign in"}
            </span>
          </button>

          {/* Divider */}
          <div className="jw-divider">
            or
          </div>

          {/* Google */}
          <button
            type="button"
            className="jw-alt"
            onClick={async () => {
              setErrorMessage("");

              const { error } =
                await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: {
                    redirectTo: `${window.location.origin}/account`,
                  },
                });

              if (error) {
                setErrorMessage(
                  error.message
                );
              }
            }}
          >
            Continue with Google
          </button>

          {/* Terms */}
          <p className="jw-foot">
            By continuing you agree to Sleek Sisters'{" "}
            <Link to="/terms">
              Terms
            </Link>{" "}
            &amp;{" "}
            <Link to="/privacy">
              Privacy Policy
            </Link>
            .
          </p>
        </form>
      </div>
    </div>
  );
}
