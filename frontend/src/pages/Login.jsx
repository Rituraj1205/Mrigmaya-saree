import { useState, useContext, useEffect } from "react";
import axios from "../api/axios";
import toast from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import BrandLoader from "../components/BrandLoader";
import { API_BASE, buildAssetUrl } from "../utils/apiBase";

const GOOGLE_START_URL = `${API_BASE}/auth/google`;
const resolveAsset = (url, fallback = "") => buildAssetUrl(url, fallback);

const MODES = {
  PASSWORD: "password",
  REGISTER: "register"
};

const TabSwitcher = ({ mode, setMode, tabs }) => (
  <div className="flex flex-wrap gap-3">
    {tabs.map((tab) => (
      <button
        key={tab.key}
        type="button"
        onClick={() => setMode(tab.key)}
        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
          mode === tab.key
            ? "bg-[var(--primary)] text-[var(--surface)] border-transparent shadow"
            : "bg-[var(--surface)]/80 text-[var(--muted)] border-[var(--border)]"
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

const LoginInput = (props) => (
  <input
    {...props}
    className={`w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-3 text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/60 ${
      props.className || ""
    }`}
  />
);

const SideVisual = ({ item }) => {
  const imageSrc = resolveAsset(item?.image || "", "");
  if (!item || !imageSrc) return null;
  return (
    <div
      className="hidden md:block rounded-3xl overflow-hidden glass-panel border border-[var(--border)] shadow-2xl relative h-[320px] w-[220px] flex-shrink-0"
      style={{
        backgroundImage: `linear-gradient(160deg, rgba(0,0,0,0.5), rgba(0,0,0,0.25)), url(${imageSrc})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
      <div className="absolute bottom-4 left-4 right-4 text-white space-y-1">
        <p className="text-sm uppercase tracking-[0.3em] text-white/70">{item.subtitle}</p>
        <p className="text-lg font-semibold">{item.title}</p>
      </div>
    </div>
  );
};

export default function Login() {
  const { login } = useContext(AuthContext);
  const [mode, setMode] = useState(MODES.PASSWORD);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginVisuals, setLoginVisuals] = useState([
    { title: "", subtitle: "", image: "" },
    { title: "", subtitle: "", image: "" }
  ]);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("/home-sections")
      .then((res) => {
        const items = (res.data || [])
          .filter((section) => section.group === "custom" && section.meta?.loginSlot !== undefined && section.active !== false)
          .sort((a, b) => (a.meta?.loginSlot ?? 0) - (b.meta?.loginSlot ?? 0));
        if (items.length) {
          const next = [0, 1].map((idx) => items.find((x) => Number(x.meta?.loginSlot) === idx) || {});
          setLoginVisuals((prev) =>
            next.map((item, i) => ({
              ...prev[i],
              ...item
            }))
          );
        }
      })
      .catch(() => {
        /* fallback to defaults */
      });
  }, []);

  const validateEmail = () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      toast.error("Please enter a valid email");
      return null;
    }
    return trimmed;
  };

  const loginWithPassword = async () => {
    const trimmed = validateEmail();
    if (!trimmed) return;
    if (!password) return toast.error("Enter your password");
    try {
      const res = await axios.post("/auth/login-password", { email: trimmed, password });
      login(res.data.token, res.data.user);
      toast.success("Logged in");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Login failed");
    }
  };

  const registerWithPassword = async () => {
    const trimmed = validateEmail();
    if (!trimmed) return;
    if (!name.trim()) return toast.error("Please enter your name");
    if (!password) return toast.error("Please set a password");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirmPassword) return toast.error("Passwords do not match");
    try {
      const res = await axios.post("/auth/register", {
        email: trimmed,
        name: name.trim(),
        password,
        mobile: mobile.trim() || undefined
      });
      login(res.data.token, res.data.user);
      toast.success("Account created");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Could not create account");
    }
  };

  const tabs = [
    { key: MODES.PASSWORD, label: "Login" },
    { key: MODES.REGISTER, label: "Create Account" }
  ];

  const leftVisual = loginVisuals[0];
  const rightVisual = loginVisuals[1] || loginVisuals[0];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[var(--bg)] via-[var(--surface-muted)] to-[var(--bg)] text-[var(--ink)] overflow-hidden flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(127,31,109,0.16),transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(43,140,127,0.14),transparent_45%)]" />
      <div className="absolute -left-16 top-10 h-40 w-40 rounded-full bg-[var(--primary-soft)] blur-3xl opacity-70 brand-floating" />
      <div className="absolute right-0 top-24 h-32 w-32 rounded-full bg-[var(--accent)] blur-3xl opacity-50 brand-floating" />

      <div className="relative w-full max-w-6xl flex items-center justify-center gap-6">
        <SideVisual item={leftVisual} />

        <div className="relative w-full max-w-3xl glass-panel rounded-[32px] border border-[var(--border)] p-8 lg:p-10 shadow-2xl overflow-hidden">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[var(--primary)]/18 blur-3xl brand-pulse" />
          <div className="absolute left-6 top-8 h-20 w-20 rounded-full bg-[var(--accent)]/18 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center gap-6 text-center">
            <BrandLoader message="Surat couture drapes" />
            <div className="w-full max-w-lg text-left">
              <TabSwitcher mode={mode} setMode={setMode} tabs={tabs} />

              {mode === MODES.PASSWORD && (
                <div className="space-y-3 mt-4">
                  <p className="text-sm text-[var(--muted)]">Use your email and password.</p>
                  <LoginInput
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <LoginInput
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                  />
                  <button
                    onClick={loginWithPassword}
                    className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--surface)] font-semibold rounded-2xl py-3 shadow-md hover:shadow-lg transition"
                  >
                    Login
                  </button>
                </div>
              )}

              {mode === MODES.REGISTER && (
                <div className="space-y-3 mt-4">
                  <p className="text-sm text-[var(--muted)]">Create an account with email, phone, and password.</p>
                  <LoginInput
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                  />
                  <LoginInput
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Phone (optional)"
                  />
                  <LoginInput
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <LoginInput
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password (min 6 characters)"
                  />
                  <LoginInput
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                  />
                  <button
                    onClick={registerWithPassword}
                    className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--surface)] font-semibold rounded-2xl py-3 shadow-md hover:shadow-lg transition"
                  >
                    Create account
                  </button>
                </div>
              )}

              <div className="pt-4 border-t border-[var(--border)] space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Or</p>
                <a
                  href={GOOGLE_START_URL}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-white/80 px-4 py-3 text-sm font-semibold text-gray-800 hover:shadow transition"
                >
                  Sign in with Google
                </a>
                <p className="text-xs text-[var(--muted)]">
                  Use a Google account listed as a Test user on the OAuth consent screen.
                </p>
              </div>
            </div>
          </div>
        </div>

        <SideVisual item={rightVisual} />
      </div>
    </div>
  );
}
