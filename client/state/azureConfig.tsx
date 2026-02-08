// Determine redirect URI based on current environment
const getRedirectUri = () => {
  if (typeof window === "undefined") {
    return "https://research-grants-spa.powerappsportals.com/";
  }

  // Use current origin - redirect to home page after login
  return window.location.origin + "/";
};

export const msalConfig = {
  auth: {
    clientId: "1dc49cf1-aa12-4bfb-bf9e-60ff6df8475e", // Application (client) ID
    authority:
      "https://ecab2cdev.b2clogin.com/tfp/20204571-3776-41c1-8358-b82ae0114e6e/b2c_1a_rg_dev_susi/v2.0/", // B2C authority with v2.0 endpoint
    knownAuthorities: ["ecab2cdev.b2clogin.com"], // B2C tenant
    redirectUri: getRedirectUri(), // Redirects to /updateProfile path
    navigateToLoginRequestUrl: true, // Return to original location after login
  },
  cache: {
    cacheLocation: "sessionStorage", // enables SSO between tabs
    storeAuthStateInCookie: true, // helpful for local dev
  },
};

export const loginRequest = {
  scopes: ["openid", "profile", "offline_access"], // Add other scopes as needed
};

// B2C Policy Configuration
export const policyConfig = {
  names: {
    signUpSignIn: "B2C_1A_RG_DEV_SUSI", // Default policy ID
  },
  authorities: {
    signUpSignIn: {
      authority:
        "https://ecab2cdev.b2clogin.com/tfp/20204571-3776-41c1-8358-b82ae0114e6e/b2c_1a_rg_dev_susi/v2.0/",
    },
  },
};
