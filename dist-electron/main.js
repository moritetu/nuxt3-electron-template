var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var import_electron = require("electron");
var import_node_path = __toESM(require("node:path"));
var import_node_fs = __toESM(require("node:fs"));
process.env.ROOT = import_node_path.default.join(__dirname, "..");
process.env.DIST = import_node_path.default.join(process.env.ROOT, "dist-electron");
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL ? import_node_path.default.join(process.env.ROOT, "src/public") : import_node_path.default.join(process.env.ROOT, ".output/public");
process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
let win;
const preload = import_node_path.default.join(process.env.DIST, "preload.js");
function bootstrap() {
  win = new import_electron.BrowserWindow({
    webPreferences: {
      preload
    }
  });
  const userHome = process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"];
  const configFile = import_node_path.default.join(userHome, "aws-config.json");
  import_electron.ipcMain.handle("writeconfig", async (event, data) => {
    try {
      import_node_fs.default.writeFileSync(configFile, JSON.stringify(data, null, "	"));
      return configFile;
    } catch (error) {
      return false;
    }
  });
  import_electron.ipcMain.handle("readconfig", () => {
    let config;
    if (import_node_fs.default.existsSync(configFile)) {
      const data = import_node_fs.default.readFileSync(configFile, "utf-8");
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
    win.loadFile(import_node_path.default.join(process.env.VITE_PUBLIC, "index.html"));
  }
}
import_electron.app.whenReady().then(bootstrap);
