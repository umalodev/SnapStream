import { contextBridge, ipcRenderer } from "electron";
try {
    console.log("[preload] loaded");
    // Test function to verify preload is working
    function testPreload() {
        console.log("[preload] Test function called - preload is working!");
        return "Preload test successful";
    }
    // Expose API minimal & stabil
    const electronAPI = Object.freeze({
        isElectron: true,
        testPreload,
        // App info
        getAppVersion: () => ipcRenderer.invoke('get-app-version'),
        getAppPath: () => ipcRenderer.invoke('get-app-path'),
        // Screen recording APIs
        getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
        // Menu events
        onMenuNewRecording: (callback) => {
            ipcRenderer.on('menu-new-recording', callback);
        },
        onMenuOpenRecording: (callback) => {
            ipcRenderer.on('menu-open-recording', callback);
        },
        // Remove listeners
        removeAllListeners: (channel) => {
            ipcRenderer.removeAllListeners(channel);
        },
        // Backend status
        getBackendStatus: () => ipcRenderer.invoke('get-backend-status'),
        // Preview window
        openPreviewWindow: (url) => ipcRenderer.invoke('open-preview-window', url),
        // Open external URL
        openExternal: (url) => ipcRenderer.invoke('open-external', url),
    });
    console.log("[preload] Exposing electronAPI:", electronAPI);
    contextBridge.exposeInMainWorld("electronAPI", electronAPI);
    console.log("[preload] electronAPI exposed successfully");
    // (opsional) wrapper ipcRenderer
    contextBridge.exposeInMainWorld("ipc", Object.freeze({
        on: (...args) => ipcRenderer.on(...args),
        off: (...args) => ipcRenderer.off(...args),
        send: (...args) => ipcRenderer.send(...args),
        invoke: (...args) => ipcRenderer.invoke(...args),
    }));
    // Marker untuk debugging di renderer
    globalThis.__PRELOAD_OK__ = true;
    // Also expose it on window for renderer access
    contextBridge.exposeInMainWorld("__PRELOAD_OK__", true);
    console.log("[preload] APIs exposed: window.electronAPI, window.ipc, window.__PRELOAD_OK__");
}
catch (err) {
    // Jika ada error runtime di preload, log agar terlihat di console main
    try {
        ipcRenderer?.send("preload-crashed", String(err));
    }
    catch { }
    console.error("[preload] FAILED:", err);
    // Jangan throw; biar Electron tidak mematikan proses renderer
}
