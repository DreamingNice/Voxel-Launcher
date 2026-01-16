# Voxel Launcher

The **Voxel Launcher** is a JavaScript-based minimal launcher for Minecraft. The project is still in development, so there may be some bugs.

---

## JAVA

Launcher curently supports all Java platforms but you need to install Java 8-17-21.

---

## Installation

You can download from releases and install it using the installer.

The launcher currently supports **Windows and Linux**. Mac OS support will come soon. 

---

# 🐧 Run Voxel Launcher on Linux (from source)

### 1️⃣ Install requirements
Make sure you have the following installed:

- Node.js 18+
node -v

- npm (comes with Node)
npm -v

- Java (required for Minecraft)
java -version

---

### UBUNTU/DEBIAN
```bash
sudo apt update
sudo apt install nodejs npm openjdk-17-jre

```

### ARCH LINUX
```bash
sudo pacman -S nodejs npm jre17-openjdk

```

### FEDORA
```bash
sudo dnf install nodejs npm java-17-openjdk

```
### CLONE THE REPOSITORY
```bash
git clone https://github.com/YOUR_USERNAME/voxel-launcher.git
cd voxel-launcher

```

### INSTALL DEPENDENCIES
```bash
npm install

```

### RUN THE LAUNCHER (development mode)
```bash
npm start

```

# BUILD LINUX BINARIES
```bash
npm run build

```
- The Output Will be Inside:

```bash
Dist/

```
---

## NPM and Node

The launcher requires **Node 18+**. If you are cloning the project, you need to install npm at the root of the project.

---

## License

This project is licensed under the **MIT License**.

---

⚠ Not affiliated with **Mojang** or **Microsoft**!
