import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { publicAsset } from "../lib/assets";

export default function Login() {
  const [method, setMethod] = useState("email");
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await login(identifier.trim(), pin);

      if (error) {
        setError(error.message);
        return;
      }

      if (!data?.user && !data?.session) {
        setError("Login failed. No user account was returned.");
        return;
      }

      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong while signing in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page" style={styles.page}>
      <div className="admin-login-card" style={styles.loginCard}>
        <div style={styles.brand}>
          <img
            src={publicAsset("images/brand/logo-mark.png")}
            alt="Sleek Sisters"
            style={styles.brandMark}
          />
          <h1 style={styles.brandTitle}>Sleek_Sisters</h1>
          <p style={styles.brandTagline}>Grace in Every Detail</p>
        </div>

        <div style={styles.heading}>
          <h2 style={styles.headingTitle}>Admin Login</h2>

          <p style={styles.headingText}>
            Sign in with your email or phone number and staff PIN.
            {window.sleekDesktop
              ? " This computer must be online to reach the live shop."
              : ""}
          </p>
          <p style={{ ...styles.headingText, marginTop: 10 }}>
            If someone forgets it, the owner can reset it from Staff.
          </p>
        </div>

        <div style={styles.methodRow}>
          <button
            type="button"
            style={{
              ...styles.methodButton,
              ...(method === "email" ? styles.methodButtonActive : {}),
            }}
            onClick={() => setMethod("email")}
          >
            Email
          </button>
          <button
            type="button"
            style={{
              ...styles.methodButton,
              ...(method === "phone" ? styles.methodButtonActive : {}),
            }}
            onClick={() => setMethod("phone")}
          >
            Phone
          </button>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="identifier" style={styles.label}>
              {method === "phone" ? "Phone Number" : "Email Address"}
            </label>

            <input
              id="identifier"
              type={method === "phone" ? "tel" : "email"}
              placeholder={
                method === "phone" ? "0712 345 678" : "Enter your email"
              }
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete={method === "phone" ? "tel" : "email"}
              required
              disabled={loading}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="pin" style={styles.label}>
              PIN or password
            </label>

            <input
              id="pin"
              type="password"
              placeholder="Staff PIN or your password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
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
          Sleek Sisters Management System
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
    background: "#0a0a0a",
    padding: "30px",
    boxSizing: "border-box",
  },
  loginCard: {
    width: "100%",
    maxWidth: "440px",
    background: "#111111",
    padding: "45px",
    borderRadius: "4px",
    border: "1px solid rgba(201, 168, 118, 0.35)",
    boxShadow: "0 15px 45px rgba(0, 0, 0, 0.35)",
    boxSizing: "border-box",
  },
  brand: {
    marginBottom: "35px",
    textAlign: "center",
  },
  brandMark: {
    width: "92px",
    height: "92px",
    objectFit: "contain",
    margin: "0 auto 12px",
    display: "block",
  },
  brandTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "700",
    letterSpacing: "0.02em",
    color: "#c9a876",
    fontFamily: "Cambria, Georgia, serif",
  },
  brandTagline: {
    margin: "6px 0 0",
    fontSize: "14px",
    fontStyle: "italic",
    color: "#e8d5a3",
  },
  heading: {
    marginBottom: "22px",
  },
  headingTitle: {
    margin: "0 0 10px",
    fontSize: "26px",
    color: "#f5ead0",
  },
  headingText: {
    margin: 0,
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#c9a876",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  methodRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    marginBottom: "18px",
  },
  methodButton: {
    border: "1px solid rgba(201, 168, 118, 0.35)",
    background: "transparent",
    color: "#c9a876",
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 600,
  },
  methodButtonActive: {
    background: "#c9a876",
    color: "#0a0a0a",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#e8d5a3",
  },
  input: {
    width: "100%",
    padding: "14px 15px",
    border: "1px solid rgba(201, 168, 118, 0.35)",
    borderRadius: "2px",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
    background: "#0a0a0a",
    color: "#f5ead0",
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
    background: "#c9a876",
    color: "#0a0a0a",
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
    borderTop: "1px solid rgba(201, 168, 118, 0.28)",
    textAlign: "center",
    fontSize: "12px",
    color: "#c9a876",
  },
};