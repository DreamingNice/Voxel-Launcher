//At the top of main.js with other requires
const { cleanupAuthServer } = require("./msauth");

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { microsoftLogin } = require("./msauth")
const path = require("path");
const os = require("os");
const { launchMinecraft, getVersions } = require("./minecraft");
const { getPreferences, savePreferences } = require("./preferences");
const { authenticateWithMicrosoft, refreshAccessToken, isTokenExpired } = require("./msauth");
const { 
  addOfflineAccount, 
  updateMicrosoftAccount, 
  getAllAccounts, 
  selectAccount, 
  getSelectedAccount, 
  removeAccount 
} = require("./accounts");
const { findAllJavaInstallations } = require("./minecraft");

function createWindow() {
  // Load saved window preferences
  const prefs = getPreferences();
  
  const win = new BrowserWindow({
    width: prefs.windowWidth || 800,
    height: prefs.windowHeight || 700,
    icon: path.join(__dirname, "build", "Stone-Block.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Save window size when resized
  win.on("resized", () => {
    const [width, height] = win.getSize();
    savePreferences({ windowWidth: width, windowHeight: height });
  });

  win.loadFile(path.join(__dirname, "index.html"));
}

//Add this before app.whenReady()
app.on("before-quit", () => {
  if (typeof cleanupAuthServer === 'function') {
    cleanupAuthServer();
  }
});

app.whenReady().then(createWindow);

ipcMain.handle("get-versions", async () => {
  try {
    return await getVersions();
  } catch (err) {
    console.error(err);
    return [];
  }
});

ipcMain.handle("get-preferences", () => {
  return getPreferences();
});

ipcMain.handle("save-preferences", (event, preferences) => {
  return savePreferences(preferences);
});

ipcMain.handle("open-game-directory", () => {
  const os = require("os");
  const gameDir = path.join(os.homedir(), ".minecraft-launcher");
  shell.openPath(gameDir);
  return { success: true };
});

ipcMain.handle("get-system-ram", () => {
  const totalRamGB = Math.floor(os.totalmem() / (1024 * 1024 * 1024));
  return totalRamGB;
});

ipcMain.handle("launch-minecraft", async (event, version, username, ramAllocation) => {
  try {
    const account = getSelectedAccount();
    
    if (!account) {
      return { success: false, error: "No account selected" };
    }
    
    // Send game started event
    event.sender.send("game-started");
    
    await launchMinecraft(
      version, 
      account.username, 
      ramAllocation || prefs.ramAllocation, 
      (progress) => {
        event.sender.send("download-progress", progress);
      }
    );
    
    // Send game closed event
    event.sender.send("game-closed");
    
    return { success: true };
  } catch (err) {
    console.error(err);
    // Send game closed event even on error
    event.sender.send("game-closed");
    return { success: false, error: err.message };
  }
});


ipcMain.handle("get-java-installations", async () => {
  try {
    const javaInstalls = findAllJavaInstallations();
    return javaInstalls;
  } catch (error) {
    console.error("Error getting Java installations:", error);
    return [];
  }
});

ipcMain.handle("ms-login", async () => {
  try {
    const authData = await authenticateWithMicrosoft();
    updateMicrosoftAccount(authData);
    return { success: true, account: authData };
  } catch (error) {
    console.error("Microsoft login error:", error.message);
    return { success: false, error: error.message || "Unknown error during Microsoft login" };
  }
});

// Fix the add-offline-account handler
ipcMain.handle("add-offline-account", async (event, username) => {
  try {
    const result = addOfflineAccount(username);
    const newAccount = result.accounts.find(acc => acc.username === username && acc.type === "offline");
    return { 
      success: true,
      account: newAccount
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-accounts", async () => {
  try {
    const accounts = getAllAccounts();
    const selectedAccount = getSelectedAccount();
    return { accounts, selectedAccount };
  } catch (error) {
    console.error("Error getting accounts:", error);
    return { accounts: [], selectedAccount: null };
  }
});

ipcMain.handle("select-account", async (event, identifier) => {
  try {
    const account = selectAccount(identifier);
    if (!account) {
      return { success: false, error: "Account not found" };
    }

    return {
      success: true,
      account: {
        username: account.username,
        type: account.type
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});


ipcMain.handle("remove-account", async (event, identifier) => {
  try {
    removeAccount(identifier);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("refresh-account", async (event, refreshToken) => {
  try {
    const authData = await refreshAccessToken(refreshToken);
    updateMicrosoftAccount(authData);
    return { success: true, account: authData };
  } catch (error) {
    console.error("Token refresh error:", error);
    return { success: false, error: error.message };
  }
});

// Add this handler for getting selected account info
ipcMain.handle("get-selected-account", async () => {
  try {
    const account = getSelectedAccount();
    if (account) {
      return { 
        success: true, 
        account: {
          username: account.username,
          type: account.type
        }
      };
    }
    return { success: true, account: null };
  } catch (error) {
    console.error("Error getting selected account:", error);
    return { success: false, account: null };
  }
});
