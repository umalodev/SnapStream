import { app, BrowserWindow, ipcMain, desktopCapturer,clipboard } from "electron";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;

// ✅ ROOT yang benar (dev: .../app, prod: resourcesPath)
const ROOT = isDev ? path.join(__dirname, "..") : app.getAppPath();

// ✅ dist yang benar (tanpa "app" dobel)
const DIST = path.join(ROOT, "dist");
const DIST_ELECTRON = path.join(ROOT, "dist-electron");

console.log("[ROOT]", ROOT);
console.log("[DIST]", DIST);
console.log("[DIST_ELECTRON]", DIST_ELECTRON);

// ✅ preload resolver
function resolvePreload() {
  const paths = [
    path.join(DIST_ELECTRON, "preload.cjs"),
    path.join(DIST_ELECTRON, "preload.js"),
  ];
  const found = paths.find((f) => fs.existsSync(f));
  console.log("[PRELOAD FOUND]", found);
  if (!found) throw new Error("Preload file NOT found in dist-electron!");
  return found;
}

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#111",
    show: false,
      fullscreenable: true,     // ✅ penting

    webPreferences: {
      preload: resolvePreload(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
win.webContents.on("before-input-event", (event, input) => {
  if (input.type !== "keyDown") return;

  if (input.key === "F11") {
    event.preventDefault();
    win?.setFullScreen(!win.isFullScreen());
  }

  if (input.key === "Escape") {
    if (win?.isFullScreen()) {
      event.preventDefault();
      win.setFullScreen(false);
    }
  }
});
  win.webContents.on("enter-html-full-screen", () => {
    win?.setFullScreen(true);
  });

  win.webContents.on("leave-html-full-screen", () => {
    win?.setFullScreen(false);
  });


  win.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
    console.log("[permission]", permission);
    const allowed = ["media", "display-capture", "fullscreen"];
    callback(allowed.includes(permission));
  });


  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(DIST, "index.html"));
  }

  win.once("ready-to-show", () => win?.show());
}

app.whenReady().then(() => {
  console.log("=== SNAPSTREAM ELECTRON START ===");
  createWindow();
});

ipcMain.handle("get-screen-sources", async () => {
  const sources = await desktopCapturer.getSources({ types: ["screen", "window"] });
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL(),
  }));
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
ipcMain.handle("get-viewer-count", async (_evt, roomId: string) => {
  try {
    const url = `http://192.168.0.34:4000/api/viewer-count/${encodeURIComponent(roomId)}`;
    const res = await fetch(url, { method: "GET" });

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 0, data: null, error: err?.message || String(err) };
  }
});
ipcMain.handle("clipboard-write-text", async (_evt, text: string) => {
  clipboard.writeText(String(text || ""));
  return true;
});

ipcMain.handle("window:toggle-fullscreen", async () => {
  if (!win) return { ok: false, isFullscreen: false };
  const next = !win.isFullScreen();
  win.setFullScreen(next);
  return { ok: true, isFullscreen: next };
});

ipcMain.handle("window:set-fullscreen", async (_evt, value: boolean) => {
  if (!win) return { ok: false, isFullscreen: false };
  win.setFullScreen(!!value);
  return { ok: true, isFullscreen: win.isFullScreen() };
});

ipcMain.handle("window:is-fullscreen", async () => {
  if (!win) return { ok: false, isFullscreen: false };
  return { ok: true, isFullscreen: win.isFullScreen() };
});
