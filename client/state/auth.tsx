import {
  PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./azureConfig";
import { useDataverseApi } from "@/hooks/useDataverseApi";
import { ContactKeys, TableName } from "@/constants";
import { toast } from "sonner";
import {
  AuthContext,
  type AuthContextShape,
  type UserProfile,
} from "./authContext";

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
    } catch {
      return null;
    }
  },

  setUser: (user: UserProfile): void => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* ignore storage errors */
    }
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
    const safeEmail = email.replace(/'/g, "''");
    const filter = `${ContactKeys.EMAILADDRESS1} eq '${safeEmail}'`;
    const listUrl = `/_api/${TableName.CONTACTS}?$filter=${filter}`;

    let listResponse = await callApi<{ value: any[] }>({
      url: listUrl,
      method: "GET",
    });

    if (!listResponse?.value?.length) {
      await callApi({
        url: `/_api/${TableName.CONTACTS}`,
        method: "POST",
        data: { [ContactKeys.EMAILADDRESS1]: email },
      });
      listResponse = await callApi<{ value: any[] }>({
        url: listUrl,
        method: "GET",
      });
    }

    return listResponse?.value?.length ? listResponse.value[0] : null;
  } catch {
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
  } catch {
    /* session bootstrap optional */
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
          // Bootstrap server session token from MSAL idToken
          try {
            const tokenResp = await instance.acquireTokenSilent({
              scopes: ["openid"],
              account: accounts[0],
            });
            await fetchAndStoreSessionToken(tokenResp.idToken);
          } catch {
            /* idToken optional for session */
          }

          const loggedUser = await createUserProfile(accounts[0], callApi);
          authStorage.setUser(loggedUser);
          setUser(loggedUser);
          setAuthed(true);

          // User just returned from B2C redirect — send them to home (clean URL, not e.g. /login).
          if (response && typeof window !== "undefined") {
            window.location.replace(`${window.location.origin}/`);
            return;
          }
        } else {
          clearAuthState(setAuthed, setUser);
        }
      } catch {
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
          clearAuthState(setAuthed, setUser);
          toast.success("You have been logged out.");
          const home =
            typeof window !== "undefined"
              ? `${window.location.origin}/`
              : "/";
          await instance.logoutRedirect({ postLogoutRedirectUri: home });
        } catch {
          clearAuthState(setAuthed, setUser);
          toast.success("You have been logged out.");
          if (typeof window !== "undefined") {
            window.location.replace(`${window.location.origin}/`);
          }
        }
      },
    }),
    [isAuthed, user, isLoading, isInteractionInProgress, instance, callApi],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
