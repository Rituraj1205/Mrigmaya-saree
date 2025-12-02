import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function GoogleAuth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  useEffect(() => {
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
      navigate(redirect || "/", { replace: true });
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
