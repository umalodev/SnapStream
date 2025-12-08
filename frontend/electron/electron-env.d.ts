/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  electronAPI: {
    isElectron: boolean;
    testPreload: () => string;
    getAppVersion: () => Promise<string>;
    getAppPath: () => Promise<string>;
    onMenuNewRecording: (callback: any) => void;
    onMenuOpenRecording: (callback: any) => void;
    removeAllListeners: (channel: string) => void;
    getBackendStatus: () => Promise<boolean>;
    openPreviewWindow: (url: string) => Promise<any>;
  };
  ipc: {
    on: (...args: any[]) => void;
    off: (...args: any[]) => void;
    send: (...args: any[]) => void;
    invoke: (...args: any[]) => Promise<any>;
  };
  __PRELOAD_OK__?: boolean;
}
