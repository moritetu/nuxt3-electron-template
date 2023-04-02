var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("api", {
  writeconfig: async (data) => {
    return await import_electron.ipcRenderer.invoke("writeconfig", data);
  },
  readconfig: async () => {
    return await import_electron.ipcRenderer.invoke("readconfig");
  }
});
