import { createContext } from "react";

export interface UserProfile {
  name: string;
  email: string;
  adxUserId?: string;
  contact: any | null;
}

export interface AuthContextShape {
  isAuthed: boolean;
  user: UserProfile | null;
  login: (isSignup?: boolean) => void;
  logout: () => void;
  isLoading: boolean;
  isLoggingIn?: boolean;
}

export const AuthContext = createContext<AuthContextShape | null>(null);
