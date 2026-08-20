import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./Register.css";

const VIDEO_SRC = "/assets/video/jawabu-hero-loop.mp4";
const POSTER_SRC = "/assets/video/jawabu-hero-poster.jpg";

export default function Register() {
  const navigate = useNavigate();

  // =========================
  // FORM STATE
  // =========================
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // =========================
  // UI STATE
  // =========================
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [focused, setFocused] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [videoOk, setVideoOk] = useState(true);
  const [stage, setStage] = useState(0);

  // =========================
  // MESSAGES
  // =========================
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // =========================
  // CINEMATIC INTRO
  // =========================
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 80),
      setTimeout(() => setStage(2), 700),
      setTimeout(() => setStage(3), 1150),
    ];

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  // =========================
  // CLEAR MESSAGES
  // =========================
  const clearMessages = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  // =========================
  // REGISTER USER
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent double submission
    if (submitting) {
      return;
    }

    clearMessages();

    // Clean user input
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    // =========================
    // VALIDATION
    // =========================

    if (!cleanName) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (!cleanEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        "Password must be at least 6 characters long."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    // =========================
    // START SUBMISSION
    // =========================

    setSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,

        options: {
          data: {
            full_name: cleanName,
          },
        },
      });

      // =========================
      // SUPABASE ERROR
      // =========================

      if (error) {
        console.error("Registration error:", error);

        setErrorMessage(
          error.message || "Unable to create your account."
        );

        return;
      }

      console.log("Registration successful:", data);

      // =========================
      // IF USER IS IMMEDIATELY LOGGED IN
      // =========================

      if (data.session) {
        setSuccessMessage(
          "Your account has been created successfully."
        );

        // Give the success message a moment to appear
        setTimeout(() => {
          navigate("/");
        }, 1200);

        return;
      }

      // =========================
      // EMAIL VERIFICATION REQUIRED
      // =========================

      setSuccessMessage(
        "Account created successfully! Please check your email to verify your account."
      );

      // Clear password fields after successful signup
      setPassword("");
      setConfirmPassword("");

      // Send user to login after a short delay
      setTimeout(() => {
        navigate("/login");
      }, 2500);

    } catch (error) {
      console.error("Unexpected registration error:", error);

      setErrorMessage(
        "Something went wrong while creating your account. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`jw-register-root${
        stage >= 1 ? " -stage1" : ""
      }${
        stage >= 2 ? " -stage2" : ""
      }${
        stage >= 3 ? " -stage3" : ""
      }`}
    >

      {/* =====================================
          BACKGROUND VIDEO
      ====================================== */}

      <div className="jw-register-media">

        {videoOk ? (
          <video
            className="jw-register-video"
            src={VIDEO_SRC}
            poster={POSTER_SRC}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onError={() => {
              console.error(
                "Jawabu registration background video failed to load."
              );

              setVideoOk(false);
            }}
          />
        ) : (
          <div className="jw-register-fallback" />
        )}

        <div className="jw-register-grain" />

        <div className="jw-register-scrim" />

      </div>

      {/* =====================================
          CINEMATIC LETTERBOX
      ====================================== */}

      <div className="jw-register-bar top" />

      <div className="jw-register-bar bottom" />

      {/* =====================================
          NAVIGATION
      ====================================== */}

      <div className="jw-register-nav">

        <Link
          to="/"
          className="jw-register-wordmark"
        >
          JAWABU
        </Link>

        <Link
          to="/login"
          className="jw-register-nav-tag"
        >
          Already have an account?
        </Link>

      </div>

      {/* =====================================
          LEFT CAPTION
      ====================================== */}

      <div className="jw-register-caption">

        <span className="jw-register-eyebrow">
          The Jawabu Edit
        </span>

        <p>
          Your beauty.
          <br />

          <span className="jw-register-script">
            Your story.
          </span>
        </p>

      </div>

      {/* =====================================
          REGISTER AREA
      ====================================== */}

      <div className="jw-register-stagearea">

        <form
          className="jw-register-card"
          onSubmit={handleSubmit}
          noValidate
        >

          {/* =====================================
              HEADER
          ====================================== */}

          <div className="jw-register-card-eyebrow">
            Welcome to Jawabu
          </div>

          <h1 className="jw-register-title">
            Create your
            <span className="jw-register-script">
              {" "}account.
            </span>
          </h1>

          <p className="jw-register-sub">
            Already a member?{" "}
            <Link to="/login">
              Sign in
            </Link>
          </p>

          {/* =====================================
              ERROR MESSAGE
          ====================================== */}

          {errorMessage && (
            <div
              className="jw-register-error"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          {/* =====================================
              SUCCESS MESSAGE
          ====================================== */}

          {successMessage && (
            <div
              className="jw-register-success"
              role="status"
            >
              {successMessage}

              <Link
                to="/login"
                className="jw-register-success-link"
              >
                Go to sign in
              </Link>
            </div>
          )}

          {/* =====================================
              FULL NAME
          ====================================== */}

          <div
            className={`jw-register-field${
              focused === "name" || fullName
                ? " -active"
                : ""
            }`}
          >

            <input
              type="text"
              placeholder=" "
              value={fullName}
              autoComplete="name"
              onChange={(e) => {
                setFullName(e.target.value);
                clearMessages();
              }}
              onFocus={() => setFocused("name")}
              onBlur={() => setFocused(null)}
              required
            />

            <label>
              Full name
            </label>

          </div>

          {/* =====================================
              EMAIL
          ====================================== */}

          <div
            className={`jw-register-field${
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
                clearMessages();
              }}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              required
            />

            <label>
              Email address
            </label>

          </div>

          {/* =====================================
              PASSWORD
          ====================================== */}

          <div
            className={`jw-register-field${
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
              autoComplete="new-password"
              onChange={(e) => {
                setPassword(e.target.value);
                clearMessages();
              }}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              required
              minLength={6}
            />

            <label>
              Password
            </label>

            <button
              type="button"
              className="jw-register-toggle"
              onClick={() =>
                setShowPassword(
                  (current) => !current
                )
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

          {/* =====================================
              CONFIRM PASSWORD
          ====================================== */}

          <div
            className={`jw-register-field${
              focused === "confirmPassword" ||
              confirmPassword
                ? " -active"
                : ""
            }`}
          >

            <input
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              placeholder=" "
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(e) => {
                setConfirmPassword(
                  e.target.value
                );
                clearMessages();
              }}
              onFocus={() =>
                setFocused("confirmPassword")
              }
              onBlur={() => setFocused(null)}
              required
              minLength={6}
            />

            <label>
              Confirm password
            </label>

            <button
              type="button"
              className="jw-register-toggle"
              onClick={() =>
                setShowConfirmPassword(
                  (current) => !current
                )
              }
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
            >
              {showConfirmPassword
                ? "HIDE"
                : "SHOW"}
            </button>

          </div>

          {/* =====================================
              CREATE ACCOUNT BUTTON
          ====================================== */}

          <button
            type="submit"
            className="jw-register-btn"
            disabled={submitting}
          >

            <span>
              {submitting
                ? "Creating account..."
                : "Create account"}
            </span>

          </button>

          {/* =====================================
              TERMS
          ====================================== */}

          <p className="jw-register-foot">

            By creating an account you agree to
            Jawabu's{" "}

            <Link to="/terms">
              Terms
            </Link>

            {" "}&amp;{" "}

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