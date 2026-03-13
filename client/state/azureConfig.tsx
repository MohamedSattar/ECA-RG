const B2C_AUTHORITY =
  import.meta.env.VITE_B2C_AUTHORITY ||
  "https://ecab2cdev.b2clogin.com/tfp/20204571-3776-41c1-8358-b82ae0114e6e/b2c_1a_rg_dev_susi/v2.0/";
const B2C_KNOWN_AUTHORITIES = (
  import.meta.env.VITE_B2C_KNOWN_AUTHORITIES || "ecab2cdev.b2clogin.com"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Redirect URI must match what's registered in Azure B2C app settings
// Use dynamic redirect URI based on current domain for multi-deployment support
const getRedirectUri = () => {
  if (typeof window === "undefined") {
    return (
      import.meta.env.VITE_PUBLIC_API_BASE_URL ||
      "https://ecacrmdev.crm15.dynamics.com"
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
    navigateToLoginRequestUrl: true,
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

// B2C Policy Configuration
export const policyConfig = {
  names: {
    signUpSignIn: "B2C_1A_RG_DEV_SUSI",
  },
  authorities: {
    signUpSignIn: {
      authority: B2C_AUTHORITY,
    },
  },
};
