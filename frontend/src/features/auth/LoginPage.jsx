import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider.jsx";
import Icon from "../../components/Icon.jsx";
import Notice from "../../components/Notice.jsx";

export default function LoginPage() {
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = "Masuk — Sistem Pelaporan";
  }, []);

  if (!loading && user) {
    return (
      <Navigate
        to={
          user.role === "SUPERADMIN"
            ? "/admin/dashboard"
            : "/pegawai/laporan/new"
        }
        replace
      />
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const signedInUser = await login(form);
      navigate(
        signedInUser.role === "SUPERADMIN"
          ? "/admin/dashboard"
          : "/pegawai/laporan/new",
        { replace: true },
      );
    } catch (requestError) {
      setError(requestError.message || "Username atau password tidak valid.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="Tentang Sistem Pelaporan">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">
            SP
          </span>
          <span>
            Sistem Pelaporan
            <br />
            Kegiatan Pegawai
          </span>
        </div>
        <div className="auth-story-copy">
          <h2>Catatan lapangan yang rapi, setiap hari.</h2>
          <p>
            Kegiatan, lokasi, dan dokumentasi tersimpan dalam satu alur yang
            mudah dipantau.
          </p>
        </div>
        <div className="auth-ledger" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <h1>Masuk ke sistem</h1>
          <p>Gunakan akun Pegawai atau Superadmin yang sudah disiapkan.</p>
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="username">
              Username
              <input
                id="username"
                autoComplete="username"
                value={form.username}
                onChange={(event) => {
                  setError("");
                  setForm({ ...form, username: event.target.value });
                }}
                required
              />
            </label>
            <label htmlFor="password">
              Password
              <span className="secret-field">
                <input
                  id="password"
                  aria-label="Password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(event) => {
                    setError("");
                    setForm({ ...form, password: event.target.value });
                  }}
                  required
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={
                    showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"
                  }
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  <Icon name={showPassword ? "eyeOff" : "eye"} />
                </button>
              </span>
            </label>
            {error && <Notice tone="error">{error}</Notice>}
            <button
              className="primary-button auth-submit"
              type="submit"
              disabled={submitting}
            >
              <span>{submitting ? "Memproses..." : "Masuk"}</span>
              <Icon name="chevronRight" />
            </button>
          </form>
          <p className="auth-help">
            Akun Anda menentukan area kerja yang dapat diakses.
          </p>
        </div>
      </section>
    </main>
  );
}
