// preload.js (CommonJS)
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getVersions: () => ipcRenderer.invoke("get-versions"),
  getPreferences: () => ipcRenderer.invoke("get-preferences"),
  savePreferences: (preferences) => ipcRenderer.invoke("save-preferences", preferences),
  launchMinecraft: (version, username, ramAllocation) => ipcRenderer.invoke("launch-minecraft", version, username, ramAllocation),
  openGameDirectory: () => ipcRenderer.invoke("open-game-directory"),
  getSystemRam: () => ipcRenderer.invoke("get-system-ram"),
  getJavaInstallations: () => ipcRenderer.invoke("get-java-installations"),
  
  // Account management
  msLogin: () => ipcRenderer.invoke("ms-login"),
  addOfflineAccount: (username) => ipcRenderer.invoke("add-offline-account", username),
  getAccounts: () => ipcRenderer.invoke("get-accounts"),
  selectAccount: (identifier) => ipcRenderer.invoke("select-account", identifier),
  removeAccount: (identifier) => ipcRenderer.invoke("remove-account", identifier),
  refreshAccount: (refreshToken) => ipcRenderer.invoke("refresh-account", refreshToken),


  onDownloadProgress: (callback) => {
    ipcRenderer.on("download-progress", (event, percent) => callback(percent));
  },
  onGameStarted: (callback) => {
    ipcRenderer.on("game-started", () => callback());
  },
  onGameClosed: (callback) => {
    ipcRenderer.on("game-closed", () => callback());
  },
  removeDownloadProgressListener: () => {
    ipcRenderer.removeAllListeners("download-progress");
  },
  
});
