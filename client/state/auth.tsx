// AuthProvider.tsx
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { loginRequest, signupRequest } from "./azureConfig";
import { useDataverseApi } from "@/hooks/useDataverseApi";
import { ContactKeys, TableName } from "@/constants";
import { toast } from "sonner";

interface UserProfile {
  name: string;
  email: string;
  adxUserId?: string;
  contact: any | null;
}

interface AuthContextShape {
  isAuthed: boolean;
  user: UserProfile | null;
  login: (isSignup?: boolean) => void;
  logout: () => void;
  isLoading: boolean;
  isLoggingIn?: boolean;
}

const AuthContext = createContext<AuthContextShape | null>(null);

const STORAGE_KEY = "auth.loggedIn";
const USER_KEY = "auth.user";

/* -------------------------------------------------------
   LOCAL STORAGE HELPERS
------------------------------------------------------- */

const authStorage = {
  getUser: (): UserProfile | null => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error("Failed to parse stored user:", error);
      return null;
    }
  },

  setUser: (user: UserProfile): void => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error("Failed to store user:", error);
    }
  },

  clearAuth: (): void => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isLoggedIn: (): boolean => {
    return localStorage.getItem(STORAGE_KEY) === "true";
  },
};

/* -------------------------------------------------------
   FETCH USER CONTACT FROM DATAVERSE
------------------------------------------------------- */

async function getCurrentUserContact(
  email: string,
  callApi: ReturnType<typeof useDataverseApi>["callApi"],
) {
  if (!email) return null;

  try {
    const filter = `${ContactKeys.EMAILADDRESS1} eq '${email}'`;
    const response = await callApi<{ value: any[] }>({
      url: `/_api/${TableName.CONTACTS}?$filter=${filter}`,
      method: "GET",
    });

    return response?.value?.length ? response.value[0] : null;
  } catch (error) {
    console.error("Error fetching user contact:", error);
    return null;
  }
}

/* -------------------------------------------------------
   CREATE USER PROFILE
------------------------------------------------------- */

async function createUserProfile(
  account: any,
  callApi: ReturnType<typeof useDataverseApi>["callApi"],
): Promise<UserProfile> {
  const adxUserId = (account?.idTokenClaims?.sub as string) || "";
  const email =
    (account?.idTokenClaims?.email as string) || account?.username || "";

  return {
    name: (account?.idTokenClaims?.name as string) || account?.username || "",
    email,
    adxUserId,
    contact: await getCurrentUserContact(email, callApi),
  };
}

/* -------------------------------------------------------
   CLEAR AUTH STATE
------------------------------------------------------- */

const clearAuthState = (
  setAuthed: (value: boolean) => void,
  setUser: (value: UserProfile | null) => void,
): void => {
  authStorage.clearAuth();
  setAuthed(false);
  setUser(null);
};

/* -------------------------------------------------------
   AUTH PROVIDER
------------------------------------------------------- */

export function AuthProvider({ children }: PropsWithChildren) {
  const { instance, inProgress } = useMsal();
  const { callApi } = useDataverseApi();

  const [isAuthed, setAuthed] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInteractionInProgress, setIsInteractionInProgress] = useState(false);

  /* -----------------------------------------------
     HANDLE REDIRECT LOGIN
  ------------------------------------------------ */

  const handleRedirect = async () => {
    setIsLoading(true);

    try {
      const response = await instance.handleRedirectPromise();
      const accounts = response
        ? [response.account]
        : instance.getAllAccounts();

      if (accounts?.length && accounts[0]) {
        const loggedUser = await createUserProfile(accounts[0], callApi);
        authStorage.setUser(loggedUser);

        setUser(loggedUser);
        setAuthed(true);
      } else {
        clearAuthState(setAuthed, setUser);
      }
    } catch (error) {
      console.error("Error handling redirect:", error);
      clearAuthState(setAuthed, setUser);
    } finally {
      setIsLoading(false);
    }
  };

  /* -----------------------------------------------
     INIT AUTH ON MOUNT
  ------------------------------------------------ */

  useEffect(() => {
    const handle = async () => {
      setIsLoading(true);

      try {
        const response = await instance.handleRedirectPromise();
        const accounts = response
          ? [response.account]
          : instance.getAllAccounts();

        if (accounts.length > 0) {
          const loggedUser = await createUserProfile(accounts[0], callApi);
          authStorage.setUser(loggedUser);
          setUser(loggedUser);
          setAuthed(true);
        } else {
          clearAuthState(setAuthed, setUser);
        }
      } catch (e) {
        console.error("Redirect handling failed", e);
        clearAuthState(setAuthed, setUser);
      } finally {
        setIsLoading(false);
      }
    };

    handle();
  }, [inProgress, instance]);

  /* -----------------------------------------------
     CONTEXT VALUE
  ------------------------------------------------ */

  const value = useMemo<AuthContextShape>(
    () => ({
      isAuthed,
      user,
      isLoading,
      isLoggingIn: isInteractionInProgress,

      login: async (isSignup?: boolean) => {
        try {
          // Prevent concurrent login attempts
          if (isInteractionInProgress) {
            console.warn(
              "[Auth] Login already in progress, ignoring duplicate request",
            );
            return;
          }

          setIsInteractionInProgress(true);
          const requestType = isSignup ? "signup" : "login";
          console.log(`[Auth] Starting SSO ${requestType}...`);

          const request = isSignup ? signupRequest : loginRequest;
          console.log("[Auth] Using redirect flow for authentication");

          // Use redirect for all environments
          await instance.loginRedirect(request);
          // Note: Control won't return here as redirect navigates away
        } catch (error: any) {
          // Handle specific MSAL errors
          if (error?.errorCode === "user_cancelled") {
            console.log("[Auth] User cancelled the login request");
            // Don't show error toast or re-throw for user cancellation - it's normal behavior
          } else if (error?.errorCode === "endpoints_resolution_error") {
            console.error(
              "[Auth] Azure B2C endpoint resolution failed. Check authority configuration.",
              error,
            );
            toast.error(
              "Authentication service unavailable. Please try again later.",
            );
            throw error;
          } else if (error?.errorCode === "network_error") {
            console.error("[Auth] Network error during authentication", error);
            toast.error("Network error. Please check your connection.");
            throw error;
          } else if (error?.errorCode === "interaction_in_progress") {
            console.error("[Auth] Interaction already in progress", error);
            toast.error(
              "An authentication request is already in progress. Please wait.",
            );
            throw error;
          } else {
            console.error("[Auth] Login error:", error);
            toast.error("Authentication failed. Please try again.");
            throw error;
          }
        } finally {
          setIsInteractionInProgress(false);
        }
      },

      logout: async () => {
        try {
          console.log("[Auth] Logging out...");
          clearAuthState(setAuthed, setUser);
          // Use redirect for logout
          await instance.logoutRedirect();
          console.log("[Auth] Logout successful");
          toast.success("You have been logged out.");
        } catch (error) {
          console.error("Logout error:", error);
          clearAuthState(setAuthed, setUser);
          toast.success("You have been logged out.");
        }
      },
    }),
    [isAuthed, user, isLoading, instance],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* -------------------------------------------------------
   HOOK
------------------------------------------------------- */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
