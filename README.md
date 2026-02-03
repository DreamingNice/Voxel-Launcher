
<img width="800" height="225" alt="Launcher Logo" src="https://github.com/user-attachments/assets/764ade90-a4ba-4b47-a1d8-3cb13bc7767f" />


# Voxel Launcher

The **Voxel Launcher** is a JavaScript-based minimal launcher for Minecraft.  
The project is still in development, so there may be some bugs.

---

## ⚠ IMPORTANT

When you open the launcher, SmartScreen may block the launcher.  
That is normal for unsigned (unlicensed) applications.
To run the laucnher, first click "More info" then "Run anyway".

---

## ☕ JAVA

The launcher currently supports all Java platforms, but you need to install following versions:

- Java 8  
- Java 17  
- Java 21  

• Built-in Java is available for **Linux and Windows devices**.  
• On **macOS**, Java must be installed manually (legacy installation for now).
We recommend downloading a build from [Azul](https://www.azul.com/downloads/?package=jdk-fx#downloads-table-zulu)

---

## 📦 Installation

You can download the launcher from the **Releases** page and install it using the installer (**for Windows and Linux currently**).

The launcher currently supports **Windows, Linux, and macOS (requires building from source)**.  
Linux and macOS binary installers are planned for future releases.

---

# 🍎 Run Voxel Launcher on macOS (from source)

### 1️⃣ Install requirements  
Make sure you have the following installed:

- Node.js 18+  
```bash
node -v
````

* npm (comes with Node)

```bash
npm -v
```

* Java (required for Minecraft)

```bash
java -version
```

---

### 🟢 Install dependencies (macOS using Homebrew)

If you don’t have Homebrew, install it first:
[https://brew.sh](https://brew.sh)

```bash
brew update
brew install node openjdk@17
```

• Also install other Java platforms (8 & 21 if needed)

---

### 📥 CLONE THE REPOSITORY

```bash
git clone https://github.com/DreamingNice/voxel-launcher.git
cd voxel-launcher
```

---

### 📦 INSTALL DEPENDENCIES

```bash
npm install
```

---

### ▶ RUN THE LAUNCHER (development mode)

```bash
npm start
```

---

# 🏗 BUILD macOS BINARIES

```bash
npm run build
```

* The output will be inside:

```bash
dist/
```

---

## 🐧 Linux Support

Linux is fully supported it has support all futures of the launcher. 
**if you encounter an issue please report to us!!**

---

## 📦 NPM and Node

The launcher requires **Node 18+**.
If you are cloning the project, you need to install npm in the root of the project.

---

## 📜 License

This project is licensed under the **GNU GPL V3.0 License**.

---

⚠ Not affiliated with **Mojang** or **Microsoft**!

---

🔹Also if you know how to code a launcher you can help us with devlopment!

---

🎮 Happy Crafting with Voxel Launcher!

---
