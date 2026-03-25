const B2C_AUTHORITY =
  import.meta.env.VITE_B2C_AUTHORITY;
const B2C_KNOWN_AUTHORITIES = 
  import.meta.env.VITE_B2C_KNOWN_AUTHORITIES
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Redirect URI must match what's registered in Azure B2C app settings
// Use dynamic redirect URI based on current domain for multi-deployment support
const getRedirectUri = () => {
  if (typeof window === "undefined") {
    return (
      import.meta.env.VITE_PUBLIC_API_BASE_URL 
    );
  }
  return `${window.location.origin}/`;
};

const REGISTERED_REDIRECT_URI = getRedirectUri();

export const msalConfig = {
  auth: {
    clientId:
      import.meta.env.VITE_B2C_CLIENT_ID ||
      "1dc49cf1-aa12-4bfb-bf9e-60ff6df8475e",
    authority: B2C_AUTHORITY,
    knownAuthorities: B2C_KNOWN_AUTHORITIES.length
      ? B2C_KNOWN_AUTHORITIES
      : ["ecab2cdev.b2clogin.com"],
    redirectUri: REGISTERED_REDIRECT_URI,
    //navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: "sessionStorage", // enables SSO between tabs
    storeAuthStateInCookie: true, // helpful for local dev
  },
};

export const loginRequest = {
  scopes: ["openid", "profile", "offline_access"],
  responseType: "code",
  codeChallenge: undefined,
};

export const signupRequest = {
  scopes: ["openid", "profile", "offline_access"],
  responseType: "code",
  codeChallenge: undefined,
  extraQueryParameters: {
    local: "signup", // Force signup experience in Azure B2C
  },
};

