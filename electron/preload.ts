import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  writeconfig: async (data: AwsConfig) => {
    return await ipcRenderer.invoke('writeconfig', data)
  },

  readconfig: async () => {
    return await ipcRenderer.invoke('readconfig')
  },
})
