// Based on https://github.com/caoxiemeihao/nuxt-electron

// Copyright (c) 2022 草鞋没号
// Released under the MIT license
// https://github.com/caoxiemeihao/nuxt-electron/blob/main/LICENSE

import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";

process.env.ROOT = path.join(__dirname, "..");
process.env.DIST = path.join(process.env.ROOT, "dist-electron");
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.ROOT, "src/public")
  : path.join(process.env.ROOT, ".output/public");
process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";

let win: BrowserWindow;
const preload = path.join(process.env.DIST, "preload.js");

function bootstrap() {
  win = new BrowserWindow({
    webPreferences: {
      preload,
    },
  });

  const userHome =
    process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"];
  const configFile = path.join(userHome!, "aws-config.json");

  ipcMain.handle("writeconfig", async (event, data) => {
    try {
      fs.writeFileSync(configFile, JSON.stringify(data, null, "\t"));
      return configFile;
    } catch (error) {
      return false;
    }
  });

  ipcMain.handle("readconfig", () => {
    let config;
    if (fs.existsSync(configFile)) {
      const data = fs.readFileSync(configFile, "utf-8");
      if (data) {
        config = JSON.parse(data);
      }
    }
    return config;
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(process.env.VITE_PUBLIC!, "index.html"));
  }
}

app.whenReady().then(bootstrap);
