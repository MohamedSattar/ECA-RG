export const msalConfig = {
  auth: {
    clientId: "1dc49cf1-aa12-4bfb-bf9e-60ff6df8475e", // Application (client) ID
    authority:
      "https://ecab2cdev.b2clogin.com/tfp/20204571-3776-41c1-8358-b82ae0114e6e/b2c_1a_rg_dev_susi/", // B2C authority
    knownAuthorities: ["ecab2cdev.b2clogin.com"], // Directory (tenant) ID
  //   redirectUri:  "https://research-grants-spa.powerappsportals.com/", // Vite dev server URL
    redirectUri: "http://localhost:5174", // Vite dev server URL
   // redirectUri: "http://localhost:5174", // Vite dev server URL here
  },
  cache: {
    cacheLocation: "sessionStorage", // enables SSO between tabs
    storeAuthStateInCookie: true, // helpful for local dev
  },
};

export const loginRequest = {
  scopes: ["openid","profile","offline_access"]  // Add other scopes as needed
};