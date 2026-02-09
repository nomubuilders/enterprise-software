import { contextBridge, ipcRenderer } from "electron";
const electronAPI = {
  // Docker management
  docker: {
    checkInstalled: () => ipcRenderer.invoke("docker:check-installed"),
    startServices: () => ipcRenderer.invoke("docker:start-services"),
    stopServices: () => ipcRenderer.invoke("docker:stop-services"),
    getHealth: () => ipcRenderer.invoke("docker:get-health"),
    pullImages: () => ipcRenderer.invoke("docker:pull-images"),
    getServiceLogs: (service) => ipcRenderer.invoke("docker:get-logs", service),
    onHealthUpdate: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on("docker:health-update", handler);
      return () => ipcRenderer.removeListener("docker:health-update", handler);
    },
    onLogOutput: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on("docker:log-output", handler);
      return () => ipcRenderer.removeListener("docker:log-output", handler);
    },
    onPullProgress: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on("docker:pull-progress", handler);
      return () => ipcRenderer.removeListener("docker:pull-progress", handler);
    }
  },
  // App info
  app: {
    getVersion: () => ipcRenderer.invoke("app:get-version"),
    getPlatform: () => ipcRenderer.invoke("app:get-platform"),
    isFirstRun: () => ipcRenderer.invoke("app:is-first-run"),
    setFirstRunComplete: () => ipcRenderer.invoke("app:set-first-run-complete")
  },
  // Filesystem operations (Database Creator & Local Folder Storage nodes)
  filesystem: {
    selectFolder: () => ipcRenderer.invoke("fs:select-folder"),
    selectDatabasePath: () => ipcRenderer.invoke("fs:select-database-path"),
    listFiles: (folderPath, pattern, recursive) => ipcRenderer.invoke("fs:list-files", folderPath, pattern, recursive),
    readFile: (filePath) => ipcRenderer.invoke("fs:read-file", filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke("fs:write-file", filePath, content),
    checkExists: (filePath) => ipcRenderer.invoke("fs:check-exists", filePath)
  },
  // Whisper voice transcription
  whisper: {
    listModels: () => ipcRenderer.invoke("whisper:list-models"),
    getModelStatus: (modelName) => ipcRenderer.invoke("whisper:get-model-status", modelName),
    downloadModel: (modelName) => ipcRenderer.invoke("whisper:download-model", modelName),
    cancelDownload: () => ipcRenderer.invoke("whisper:cancel-download"),
    deleteModel: (modelName) => ipcRenderer.invoke("whisper:delete-model", modelName),
    transcribe: (audioBase64, options) => ipcRenderer.invoke("whisper:transcribe", audioBase64, options),
    onDownloadProgress: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on("whisper:download-progress", handler);
      return () => ipcRenderer.removeListener("whisper:download-progress", handler);
    }
  },
  // Auto-updater
  updater: {
    checkForUpdates: () => ipcRenderer.invoke("updater:check"),
    downloadUpdate: () => ipcRenderer.invoke("updater:download"),
    installUpdate: () => ipcRenderer.invoke("updater:install"),
    onUpdateAvailable: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on("updater:available", handler);
      return () => ipcRenderer.removeListener("updater:available", handler);
    },
    onUpdateDownloaded: (callback) => {
      const handler = () => callback();
      ipcRenderer.on("updater:downloaded", handler);
      return () => ipcRenderer.removeListener("updater:downloaded", handler);
    }
  }
};
contextBridge.exposeInMainWorld("electronAPI", electronAPI);
