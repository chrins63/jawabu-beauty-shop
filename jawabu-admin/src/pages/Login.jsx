import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await login(email.trim(), password);

      if (error) {
        setError(error.message);
        return;
      }

      if (!data?.user) {
        setError("Login failed. No user account was returned.");
        return;
      }

      console.log("Successfully logged in:", data.user);
      navigate("/"); // Redirect to dashboard
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong while signing in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.loginCard}>
        <div style={styles.brand}>
          <h1 style={styles.brandTitle}>JAWABU BEAUTY</h1>
          <div style={styles.brandLine}></div>
        </div>

        <div style={styles.heading}>
          <h2 style={styles.headingTitle}>Admin Login</h2>

          <p style={styles.headingText}>
            Sign in to access the Jawabu Beauty management system.
          </p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>
              Email Address
            </label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={loading}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>
              Password
            </label>

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
              style={styles.input}
            />
          </div>

          {error && (
            <div style={styles.error}>
              <strong>Login failed</strong>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={styles.footer}>
          Jawabu Beauty Management System
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f7f3ef",
    padding: "30px",
    boxSizing: "border-box",
  },
  loginCard: {
    width: "100%",
    maxWidth: "440px",
    background: "#ffffff",
    padding: "45px",
    borderRadius: "18px",
    boxShadow: "0 15px 45px rgba(0, 0, 0, 0.08)",
    boxSizing: "border-box",
  },
  brand: {
    marginBottom: "35px",
  },
  brandTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "700",
    letterSpacing: "1px",
    color: "#171717",
  },
  brandLine: {
    width: "55px",
    height: "3px",
    background: "#e91e63",
    marginTop: "10px",
    borderRadius: "10px",
  },
  heading: {
    marginBottom: "30px",
  },
  headingTitle: {
    margin: "0 0 10px",
    fontSize: "26px",
    color: "#171717",
  },
  headingText: {
    margin: 0,
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#777",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#333",
  },
  input: {
    width: "100%",
    padding: "14px 15px",
    border: "1px solid #ddd",
    borderRadius: "9px",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    color: "#222",
  },
  error: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "13px 15px",
    borderRadius: "9px",
    background: "#fff0f0",
    border: "1px solid #ffd2d2",
    color: "#c62828",
    fontSize: "13px",
    lineHeight: "1.4",
  },
  button: {
    width: "100%",
    padding: "15px",
    border: "none",
    borderRadius: "9px",
    background: "#e91e63",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },
  buttonDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },
  footer: {
    marginTop: "30px",
    paddingTop: "20px",
    borderTop: "1px solid #eee",
    textAlign: "center",
    fontSize: "12px",
    color: "#999",
  },
};