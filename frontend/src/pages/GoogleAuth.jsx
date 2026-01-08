import { useEffect, useRef, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function GoogleAuth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const token = params.get("token");
    const name = params.get("name");
    const email = params.get("email");
    const redirect = params.get("redirect") || "/";
    const error = params.get("error");

    if (error) {
      navigate("/login", { replace: true, state: { error: "Google sign-in failed" } });
      return;
    }

    if (token) {
      login(token, { name, email });
      localStorage.setItem("login_success", "1");
      // Use hard navigation to avoid router re-renders getting throttled.
      window.location.replace(redirect || "/");
    } else {
      navigate("/login", { replace: true });
    }
  }, [params, login, navigate]);

  return (
    <div className="p-6 min-h-screen bg-[#fefbfe] text-gray-800">
      <p>Signing you in with Google...</p>
    </div>
  );
}
