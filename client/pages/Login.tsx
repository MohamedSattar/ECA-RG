import { useEffect } from "react";
import { useAuth } from "@/state/useAuth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login, isAuthed, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthed) {
      navigate("/", { replace: true });
    }
  }, [isAuthed, isLoading, navigate]);

  return (
    <section className="container py-16">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Log in</h1>
      <p className="mt-2 text-muted-foreground">Click the button below to simulate login (stores a flag in your browser). Replace with real auth later.</p>
      <div className="mt-6 flex gap-3">
        {!isAuthed ? (
          <button
            type="button"
            onClick={() => {
              void login();
            }}
            className="inline-flex items-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-95"
          >
            Sign in
          </button>
        ) : (
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center rounded-md border px-5 py-2 text-sm"
          >
            You’re logged in — Go Home
          </button>
        )}
      </div>
    </section>
  );
}
