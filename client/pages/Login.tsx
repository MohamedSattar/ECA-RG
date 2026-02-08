import { useAuth } from "@/state/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login, isAuthed } = useAuth();
  const navigate = useNavigate();
  return (
    <section className="container py-16">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Log in</h1>
      <p className="mt-2 text-muted-foreground">Click the button below to simulate login (stores a flag in your browser). Replace with real auth later.</p>
      <div className="mt-6 flex gap-3">
        {!isAuthed ? (
          <button
            onClick={() => { login(); navigate("/"); }}
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
