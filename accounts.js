const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const ACCOUNTS_FILE = path.join(os.homedir(), ".minecraft-launcher", "accounts.json");
const ENCRYPTION_KEY = "voxel-launcher-secure-key-2024"; // In production, use a more secure key

/**
 * Encrypt sensitive data
 */
function encrypt(text) {
  const cipher = crypto.createCipher("aes-256-cbc", ENCRYPTION_KEY);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

/**
 * Decrypt sensitive data
 */
function decrypt(encrypted) {
  try {
    const decipher = crypto.createDecipher("aes-256-cbc", ENCRYPTION_KEY);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
}

/**
 * Load all accounts from disk
 */
function loadAccounts() {
  try {
    if (!fs.existsSync(ACCOUNTS_FILE)) {
      return { accounts: [], selectedAccount: null };
    }

    const data = fs.readFileSync(ACCOUNTS_FILE, "utf8");
    const parsed = JSON.parse(data);

    // Decrypt sensitive data
    if (parsed.accounts) {
      parsed.accounts = parsed.accounts.map(account => {
        if (account.type === "microsoft" && account.accessToken) {
          account.accessToken = decrypt(account.accessToken);
          if (account.refreshToken) {
            account.refreshToken = decrypt(account.refreshToken);
          }
        }
        return account;
      });
    }

    return parsed;
  } catch (error) {
    console.error("Error loading accounts:", error);
    return { accounts: [], selectedAccount: null };
  }
}

/**
 * Save accounts to disk
 */
function saveAccounts(accountsData) {
  try {
    // Ensure directory exists
    const dir = path.dirname(ACCOUNTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Encrypt sensitive data before saving
    const dataToSave = { ...accountsData };
    if (dataToSave.accounts) {
      dataToSave.accounts = dataToSave.accounts.map(account => {
        const acc = { ...account };
        if (acc.type === "microsoft" && acc.accessToken) {
          acc.accessToken = encrypt(acc.accessToken);
          if (acc.refreshToken) {
            acc.refreshToken = encrypt(acc.refreshToken);
          }
        }
        return acc;
      });
    }

    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(dataToSave, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving accounts:", error);
    return false;
  }
}

/**
 * Add or update an account
 */
function addAccount(accountData) {
  const accounts = loadAccounts();
  
  // Check if account already exists (by UUID for Microsoft, username for offline)
  const existingIndex = accounts.accounts.findIndex(acc => {
    if (accountData.type === "microsoft") {
      return acc.uuid === accountData.uuid;
    } else {
      return acc.username === accountData.username && acc.type === "offline";
    }
  });

  if (existingIndex !== -1) {
    // Update existing account
    accounts.accounts[existingIndex] = {
      ...accounts.accounts[existingIndex],
      ...accountData,
      lastUsed: Date.now(),
    };
  } else {
    // Add new account
    accounts.accounts.push({
      ...accountData,
      addedAt: Date.now(),
      lastUsed: Date.now(),
    });
  }

  // Set as selected account if it's the first one
  if (!accounts.selectedAccount) {
    accounts.selectedAccount = accountData.type === "microsoft" ? accountData.uuid : accountData.username;
  }

  saveAccounts(accounts);
  return accounts;
}

/**
 * Remove an account
 */
function removeAccount(identifier) {
  const accounts = loadAccounts();
  
  accounts.accounts = accounts.accounts.filter(acc => {
    const accId = acc.type === "microsoft" ? acc.uuid : acc.username;
    return accId !== identifier;
  });

  // If removed account was selected, select another one
  if (accounts.selectedAccount === identifier) {
    accounts.selectedAccount = accounts.accounts.length > 0
      ? (accounts.accounts[0].type === "microsoft" ? accounts.accounts[0].uuid : accounts.accounts[0].username)
      : null;
  }

  saveAccounts(accounts);
  return accounts;
}

/**
 * Select an account
 */
function selectAccount(identifier) {
  const accounts = loadAccounts();
  
  const account = accounts.accounts.find(acc => {
    const accId = acc.type === "microsoft" ? acc.uuid : acc.username;
    return accId === identifier;
  });

  if (account) {
    accounts.selectedAccount = identifier;
    account.lastUsed = Date.now();
    saveAccounts(accounts);
    return account;
  }

  return null;
}

/**
 * Get the currently selected account
 */
function getSelectedAccount() {
  const accounts = loadAccounts();
  
  if (!accounts.selectedAccount) {
    return null;
  }

  const account = accounts.accounts.find(acc => {
    const accId = acc.type === "microsoft" ? acc.uuid : acc.username;
    return accId === accounts.selectedAccount;
  });

  return account || null;
}

/**
 * Get all accounts
 */
function getAllAccounts() {
  const accounts = loadAccounts();
  return accounts.accounts || [];
}

/**
 * Add offline account
 */
function addOfflineAccount(username) {
  if (!username || username.trim().length === 0) {
    throw new Error("Username cannot be empty");
  }

  if (username.length > 16) {
    throw new Error("Username must be 16 characters or less");
  }

  const accountData = {
    type: "offline",
    username: username.trim(),
    uuid: null,
    accessToken: null,
    refreshToken: null,
  };

  return addAccount(accountData);
}

/**
 * Update Microsoft account
 */
function updateMicrosoftAccount(accountData) {
  return addAccount({
    type: "microsoft",
    ...accountData,
  });
}

module.exports = {
  loadAccounts,
  saveAccounts,
  addAccount,
  removeAccount,
  selectAccount,
  getSelectedAccount,
  getAllAccounts,
  addOfflineAccount,
  updateMicrosoftAccount,
};

//Scure and Future-proof

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

function getKey() {
  return crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
}

//Encrypt

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

//Decyrpt

function decrypt(encrypted) {
  try {
    const [ivHex, data] = encrypted.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(data, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (e) {
    console.error("Decryption failed:", e);
    return null;
  }
}
