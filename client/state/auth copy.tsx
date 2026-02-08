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
import { loginRequest } from "./azureConfig";
import { useDataverseApi } from "@/hooks/useDataverseApi";
import { ContactKeys, TableName } from "@/constants";


interface UserProfile {
  name: string;
  email: string;
  adxUserId?: string;
  contact: string | null;
}

interface AuthContextShape {
  isAuthed: boolean;
  user: UserProfile | null;
  login: () => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextShape | null>(null);

const STORAGE_KEY = "auth.loggedIn";
const USER_KEY = "auth.user";

// Storage helper functions
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

const { callApi } = useDataverseApi();

// Create user profile from MSAL account
const createUserProfile = async (account: any): Promise<UserProfile> => ({
  name: (account?.idTokenClaims?.name as string) || account?.username || "",
  email: (account?.idTokenClaims?.email as string) || account?.username || "",
  adxUserId: (account?.idTokenClaims?.sub as string) || "",
  contact: await getCurrentUserContact(account?.idTokenClaims?.sub as string) || null,
});

  const getCurrentUserContact = async (adxUserId: string) => {
    try {
      const filter = `${ContactKeys.ADX_USERID} eq '${adxUserId}'`;
      const response = await callApi<{ value: any[] }>({
        url: `/_api/${TableName.CONTACTS}?$filter=${filter}`,
        method: "GET",
      });      
      return response?.value && response.value.length > 0 ? response.value[0] : null;
    } catch (error) {
      console.error("Error fetching user contact:", error);
      return null;
    }
  };

// Clear auth state helper
const clearAuthState = (
  setAuthed: (value: boolean) => void,
  setUser: (value: UserProfile | null) => void
): void => {
  authStorage.clearAuth();
  setAuthed(false);
  setUser(null);
};

export function AuthProvider({ children }: PropsWithChildren) {
  const { instance, accounts } = useMsal();
  const [isAuthed, setAuthed] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  

  const handleRedirect = async () => {
    setIsLoading(true);
    try {
      const response = await instance.handleRedirectPromise();
      const accountsList = response ? [response.account] : instance.getAllAccounts();
      
      if (accountsList && accountsList.length > 0 && accountsList[0]) {
        const loggedUser = await createUserProfile(accountsList[0]);
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



  // Initialize auth on mount
  useEffect(() => {
    handleRedirect();
  }, [instance]);

  const value = useMemo<AuthContextShape>(
    () => ({
      isAuthed,
      user,
      isLoading,
      
      // ----- LOGIN -----
      login: async () => {
        try {
          await instance.loginRedirect(loginRequest);
        } catch (error) {
          console.error("Login error:", error);
        }
      },

      // ----- LOGOUT -----
      logout: async () => {
        try {
          clearAuthState(setAuthed, setUser);
          
          await instance.logoutRedirect({
            onRedirectNavigate: () => {
              window.location.href = "/";
              return false;
            },
          });
        } catch (error) {
          console.error("Logout error:", error);
          clearAuthState(setAuthed, setUser);
        }
      },
    }),
    [isAuthed, user, isLoading, instance]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
