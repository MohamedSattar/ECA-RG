import { useAuth } from "@/state/useAuth";
import { Navigate } from "react-router-dom";

type Props = { children: JSX.Element };

export function ProtectedRoute({ children }: Props) {
  const { isAuthed, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="loader">Loading...</div>
      </div>
    );
  }

  return isAuthed ? children : <Navigate to="/login" replace />;
}
