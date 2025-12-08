"use strict";
const electron = require("electron");
try {
  let testPreload = function() {
    console.log("[preload] Test function called - preload is working!");
    return "Preload test successful";
  };
  console.log("[preload] loaded");
  const electronAPI = Object.freeze({
    isElectron: true,
    testPreload,
    // App info
    getAppVersion: () => electron.ipcRenderer.invoke("get-app-version"),
    getAppPath: () => electron.ipcRenderer.invoke("get-app-path"),
    // Screen recording APIs
    getScreenSources: () => electron.ipcRenderer.invoke("get-screen-sources"),
    // Menu events
    onMenuNewRecording: (callback) => {
      electron.ipcRenderer.on("menu-new-recording", callback);
    },
    onMenuOpenRecording: (callback) => {
      electron.ipcRenderer.on("menu-open-recording", callback);
    },
    // Remove listeners
    removeAllListeners: (channel) => {
      electron.ipcRenderer.removeAllListeners(channel);
    },
    // Backend status
    getBackendStatus: () => electron.ipcRenderer.invoke("get-backend-status"),
    // Preview window
    openPreviewWindow: (url) => electron.ipcRenderer.invoke("open-preview-window", url),
    // Open external URL
    openExternal: (url) => electron.ipcRenderer.invoke("open-external", url)
  });
  console.log("[preload] Exposing electronAPI:", electronAPI);
  electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
  console.log("[preload] electronAPI exposed successfully");
  electron.contextBridge.exposeInMainWorld(
    "ipc",
    Object.freeze({
      on: (...args) => electron.ipcRenderer.on(...args),
      off: (...args) => electron.ipcRenderer.off(...args),
      send: (...args) => electron.ipcRenderer.send(...args),
      invoke: (...args) => electron.ipcRenderer.invoke(...args)
    })
  );
  globalThis.__PRELOAD_OK__ = true;
  electron.contextBridge.exposeInMainWorld("__PRELOAD_OK__", true);
  console.log("[preload] APIs exposed: window.electronAPI, window.ipc, window.__PRELOAD_OK__");
} catch (err) {
  try {
    electron.ipcRenderer?.send("preload-crashed", String(err));
  } catch {
  }
  console.error("[preload] FAILED:", err);
}
