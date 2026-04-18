// AuthProvider.tsx
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useMsal } from "@azure/msal-react";
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
const SESSION_TOKEN_KEY = "auth.sessionToken";

/* -------------------------------------------------------
   LOCAL STORAGE HELPERS
------------------------------------------------------- */

const authStorage = {
  getUser: (): UserProfile | null => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  },

  setUser: (user: UserProfile): void => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {}
  },

  clearAuth: (): void => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
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

    if (response?.value?.length == 0) {
      const data = {
        emailaddress1: email,
      };
      const resp = await callApi<{ value: any[] }>({
        url: `/_api/${TableName.CONTACTS}?$filter=${filter}`,
        method: "POST",
        data,
      });
      const response = await callApi<{ value: any[] }>({
        url: `/_api/${TableName.CONTACTS}?$filter=${filter}`,
        method: "GET",
      });
      return response?.value?.length ? response.value[0] : null;
    }

    return response?.value?.length ? response.value[0] : null;
  } catch (error) {
    return null;
  }
}

/* -------------------------------------------------------
   SERVER SESSION TOKEN BOOTSTRAP
------------------------------------------------------- */

/** Exchange the MSAL idToken for a server-issued signed session token.
 *  The server verifies the email claim, looks up the contactId in Dataverse,
 *  and returns a short-lived HMAC-signed token the proxy will use to enforce
 *  per-user data filters on every /_api request.
 */
async function fetchAndStoreSessionToken(idToken: string): Promise<void> {
  try {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
      return;
    }
    const data = await res.json();
    if (data.sessionToken) {
      localStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken);
    }
  } catch (err) {}
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
          try {
            const tokenResp = await instance.acquireTokenSilent({
              scopes: ["openid"],
              account: accounts[0],
            });
            await fetchAndStoreSessionToken(tokenResp.idToken);
          } catch (tokenErr) {}

          const loggedUser = await createUserProfile(accounts[0], callApi);
          authStorage.setUser(loggedUser);
          setUser(loggedUser);
          setAuthed(true);
        } else {
          clearAuthState(setAuthed, setUser);
        }
      } catch (e) {
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

      login: async () => {
        try {
          // Prevent concurrent login attempts
          if (isInteractionInProgress) {
            return;
          }

          setIsInteractionInProgress(true);

          // Use redirect for all environments
          await instance.loginRedirect(loginRequest);
          // Note: Control won't return here as redirect navigates away
        } catch (error: any) {
          // Handle specific MSAL errors
          if (error?.errorCode === "user_cancelled") {
            // Don't show error toast or re-throw for user cancellation - it's normal behavior
          } else if (error?.errorCode === "endpoints_resolution_error") {
            toast.error(
              "Authentication service unavailable. Please try again later.",
            );
            throw error;
          } else if (error?.errorCode === "network_error") {
            toast.error("Network error. Please check your connection.");
            throw error;
          } else if (error?.errorCode === "interaction_in_progress") {
            toast.error(
              "An authentication request is already in progress. Please wait.",
            );
            throw error;
          } else {
            toast.error("Authentication failed. Please try again.");
            throw error;
          }
        } finally {
          setIsInteractionInProgress(false);
        }
      },

      logout: async () => {
        try {
          try {
            await fetch("/api/auth/logout", {
              method: "POST",
              credentials: "include",
            });
          } catch {
            /* ignore */
          }
          clearAuthState(setAuthed, setUser);
          // Use redirect for logout
          await instance.logoutRedirect();
          toast.success("You have been logged out.");
        } catch (error) {
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
