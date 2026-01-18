const axios = require("axios");
const { BrowserWindow } = require("electron");
const crypto = require("crypto");

// Microsoft OAuth2 Configuration
// Fixed: Use the official Minecraft client_id
const CLIENT_ID = "000000004C12AE6F"; // Corrected Minecraft client_id
const REDIRECT_URI = "https://login.live.com/oauth20_desktop.srf";
const SCOPES = "XboxLive.signin offline_access";

let authInProgress = false;

/**
 * Generate PKCE challenge
 */
function generateCodeChallenge() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

/**
 * Step 1: Open Microsoft login window and get authorization code
 */
async function getMicrosoftAuthCode() {
  if (authInProgress) {
    throw new Error("Authentication already in progress");
  }

  authInProgress = true;

  const { verifier, challenge } = generateCodeChallenge();
  
  const authUrl = `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?` +
    `client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&code_challenge=${challenge}` +
    `&code_challenge_method=S256` +
    `&prompt=select_account`;

  return new Promise((resolve, reject) => {
    let resolved = false;

    const authWindow = new BrowserWindow({
      width: 600,
      height: 750,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: "persist:msauth",
      },
    });

    authWindow.once("ready-to-show", () => {
      authWindow.show();
    });

    const handleUrl = (url) => {
      if (resolved) return;

      if (url.includes("login.live.com/oauth20_desktop.srf")) {
        try {
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get("code");
          const error = urlObj.searchParams.get("error");

          if (code) {
            resolved = true;
            authInProgress = false;
            console.log("✅ Got authorization code");
            
            if (!authWindow.isDestroyed()) {
              authWindow.close();
            }
            
            resolve({ code, verifier });
          } else if (error) {
            resolved = true;
            authInProgress = false;
            
            if (!authWindow.isDestroyed()) {
              authWindow.close();
            }
            
            reject(new Error(`Auth error: ${error}`));
          }
        } catch (err) {
          resolved = true;
          authInProgress = false;
          
          if (!authWindow.isDestroyed()) {
            authWindow.close();
          }
          
          reject(err);
        }
      }
    };

    authWindow.webContents.on("will-redirect", (event, url) => {
      handleUrl(url);
    });

    authWindow.webContents.on("did-navigate", (event, url) => {
      handleUrl(url);
    });

    authWindow.webContents.on("will-navigate", (event, url) => {
      handleUrl(url);
    });

    authWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
      handleUrl(validatedURL);
    });

    authWindow.on("closed", () => {
      if (!resolved) {
        resolved = true;
        authInProgress = false;
        reject(new Error("Authentication window closed"));
      }
    });

    authWindow.loadURL(authUrl);
  });
}

/**
 * Step 2: Exchange authorization code for Microsoft access token
 */
async function getMicrosoftToken(code, verifier) {
  const params = new URLSearchParams();
  params.append("client_id", CLIENT_ID);
  params.append("code", code);
  params.append("code_verifier", verifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", REDIRECT_URI);

  console.log("🔄 Exchanging authorization code for token...");

  try {
    const response = await axios.post(
      "https://login.microsoftonline.com/consumers/oauth2/v2.0/token",
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("✅ Got Microsoft access token");
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error("❌ Token exchange failed:", error.response.data);
      throw new Error(
        `Token exchange failed: ${error.response.data.error_description || error.response.data.error}`
      );
    }
    throw error;
  }
}

/**
 * Step 3: Authenticate with Xbox Live
 */
async function authenticateXboxLive(msAccessToken) {
  console.log("🔄 Authenticating with Xbox Live...");
  
  try {
    const response = await axios.post(
      "https://user.auth.xboxlive.com/user/authenticate",
      {
        Properties: {
          AuthMethod: "RPS",
          SiteName: "user.auth.xboxlive.com",
          RpsTicket: `d=${msAccessToken}`,
        },
        RelyingParty: "http://auth.xboxlive.com",
        TokenType: "JWT",
      },
      {
        headers: { 
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    console.log("✅ Xbox Live authentication successful");
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error("❌ Xbox Live auth failed:", error.response.data);
    }
    throw error;
  }
}

/**
 * Step 4: Authenticate with XSTS
 */
async function authenticateXSTS(xblToken) {
  console.log("🔄 Authenticating with XSTS...");
  
  try {
    const response = await axios.post(
      "https://xsts.auth.xboxlive.com/xsts/authorize",
      {
        Properties: {
          SandboxId: "RETAIL",
          UserTokens: [xblToken],
        },
        RelyingParty: "rp://api.minecraftservices.com/",
        TokenType: "JWT",
      },
      {
        headers: { 
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    console.log("✅ XSTS authentication successful");
    return response.data;
  } catch (error) {
    if (error.response?.data?.XErr) {
      const xErr = error.response.data.XErr;
      if (xErr === 2148916233) {
        throw new Error("This Microsoft account doesn't have an Xbox account. Create one at xbox.com");
      } else if (xErr === 2148916238) {
        throw new Error("This is a child account. It must be added to a Family by an adult");
      }
    }
    throw error;
  }
}

/**
 * Step 5: Authenticate with Minecraft
 */
async function authenticateMinecraft(xstsToken, userHash) {
  console.log("🔄 Authenticating with Minecraft...");
  
  try {
    const response = await axios.post(
      "https://api.minecraftservices.com/authentication/login_with_xbox",
      {
        identityToken: `XBL3.0 x=${userHash};${xstsToken}`,
      },
      {
        headers: { 
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    console.log("✅ Minecraft authentication successful");
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error("❌ Minecraft auth failed:", error.response.data);
    }
    throw error;
  }
}

/**
 * Step 6: Get Minecraft profile
 */
async function getMinecraftProfile(mcAccessToken) {
  console.log("🔄 Getting Minecraft profile...");
  
  try {
    const response = await axios.get(
      "https://api.minecraftservices.com/minecraft/profile",
      {
        headers: { Authorization: `Bearer ${mcAccessToken}` },
      }
    );

    console.log("✅ Got Minecraft profile:", response.data.name);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("This Microsoft account doesn't own Minecraft Java Edition");
    }
    throw error;
  }
}

/**
 * Check game ownership
 */
async function checkGameOwnership(mcAccessToken) {
  try {
    const response = await axios.get(
      "https://api.minecraftservices.com/entitlements/mcstore",
      {
        headers: { Authorization: `Bearer ${mcAccessToken}` },
      }
    );

    return response.data.items?.some(
      item => item.name === "product_minecraft" || item.name === "game_minecraft"
    ) || false;
  } catch (error) {
    return false;
  }
}

/**
 * Complete authentication flow
 */
async function authenticateWithMicrosoft() {
  try {
    console.log("🚀 Starting Microsoft authentication...");
    
    const { code, verifier } = await getMicrosoftAuthCode();
    const msToken = await getMicrosoftToken(code, verifier);
    const xblAuth = await authenticateXboxLive(msToken.access_token);
    const xstsAuth = await authenticateXSTS(xblAuth.Token);
    const mcAuth = await authenticateMinecraft(xstsAuth.Token, xblAuth.DisplayClaims.xui[0].uhs);
    const profile = await getMinecraftProfile(mcAuth.access_token);
    const ownsGame = await checkGameOwnership(mcAuth.access_token);

    console.log("✅ Authentication complete!");

    return {
      accessToken: mcAuth.access_token,
      refreshToken: msToken.refresh_token,
      username: profile.name,
      uuid: profile.id,
      ownsGame,
      expiresAt: Date.now() + (msToken.expires_in || 3600) * 1000,
    };
  } catch (error) {
    console.error("❌ Authentication failed:", error.message);
    authInProgress = false;
    throw error;
  }
}

/**
 * Refresh token
 */
async function refreshAccessToken(refreshToken) {
  try {
    console.log("🔄 Refreshing access token...");
    
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      redirect_uri: REDIRECT_URI,
    });

    const response = await axios.post(
      "https://login.microsoftonline.com/consumers/oauth2/v2.0/token",
      params.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const msToken = response.data;
    const xblAuth = await authenticateXboxLive(msToken.access_token);
    const xstsAuth = await authenticateXSTS(xblAuth.Token);
    const mcAuth = await authenticateMinecraft(xstsAuth.Token, xblAuth.DisplayClaims.xui[0].uhs);
    const profile = await getMinecraftProfile(mcAuth.access_token);

    console.log("✅ Token refresh successful");

    return {
      accessToken: mcAuth.access_token,
      refreshToken: msToken.refresh_token,
      username: profile.name,
      uuid: profile.id,
      expiresAt: Date.now() + (msToken.expires_in || 3600) * 1000,
    };
  } catch (error) {
    console.error("❌ Token refresh failed");
    throw new Error("Token refresh failed. Please log in again.");
  }
}

function isTokenExpired(expiresAt) {
  return Date.now() >= expiresAt - 300000;
}

function cleanupAuthServer() {
  authInProgress = false;
}

module.exports = {
  authenticateWithMicrosoft,
  refreshAccessToken,
  isTokenExpired,
  cleanupAuthServer,
};