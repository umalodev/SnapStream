import { app as r, ipcMain as s, desktopCapturer as p, clipboard as h, BrowserWindow as m } from "electron";
import o from "node:path";
import S from "node:fs";
import { fileURLToPath as F } from "node:url";
const g = F(import.meta.url), y = o.dirname(g), f = !r.isPackaged, u = f ? o.join(y, "..") : r.getAppPath(), w = o.join(u, "dist"), c = o.join(u, "dist-electron");
console.log("[ROOT]", u);
console.log("[DIST]", w);
console.log("[DIST_ELECTRON]", c);
function T() {
  const n = [
    o.join(c, "preload.cjs"),
    o.join(c, "preload.js")
  ].find((l) => S.existsSync(l));
  if (console.log("[PRELOAD FOUND]", n), !n) throw new Error("Preload file NOT found in dist-electron!");
  return n;
}
let e = null;
function k() {
  e = new m({
    width: 1280,
    height: 800,
    backgroundColor: "#111",
    show: !1,
    fullscreenable: !0,
    // ✅ penting
    webPreferences: {
      preload: T(),
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), e.webContents.on("before-input-event", (t, n) => {
    n.type === "keyDown" && (n.key === "F11" && (t.preventDefault(), e?.setFullScreen(!e.isFullScreen())), n.key === "Escape" && e?.isFullScreen() && (t.preventDefault(), e.setFullScreen(!1)));
  }), e.webContents.on("enter-html-full-screen", () => {
    e?.setFullScreen(!0);
  }), e.webContents.on("leave-html-full-screen", () => {
    e?.setFullScreen(!1);
  }), e.webContents.session.setPermissionRequestHandler((t, n, l) => {
    console.log("[permission]", n), l(["media", "display-capture", "fullscreen"].includes(n));
  }), f ? e.loadURL("http://localhost:5173") : e.loadFile(o.join(w, "index.html")), e.once("ready-to-show", () => e?.show());
}
r.whenReady().then(() => {
  console.log("=== SNAPSTREAM ELECTRON START ==="), k();
});
s.handle("get-screen-sources", async () => (await p.getSources({ types: ["screen", "window"] })).map((n) => ({
  id: n.id,
  name: n.name,
  thumbnail: n.thumbnail.toDataURL()
})));
r.on("window-all-closed", () => {
  process.platform !== "darwin" && r.quit();
});
s.handle("get-viewer-count", async (t, n) => {
  try {
    const l = `http://192.168.0.34:4000/api/viewer-count/${encodeURIComponent(n)}`, a = await fetch(l, { method: "GET" }), d = await a.text();
    let i = null;
    try {
      i = JSON.parse(d);
    } catch {
      i = { raw: d };
    }
    return { ok: a.ok, status: a.status, data: i };
  } catch (l) {
    return { ok: !1, status: 0, data: null, error: l?.message || String(l) };
  }
});
s.handle("clipboard-write-text", async (t, n) => (h.writeText(String(n || "")), !0));
s.handle("window:toggle-fullscreen", async () => {
  if (!e) return { ok: !1, isFullscreen: !1 };
  const t = !e.isFullScreen();
  return e.setFullScreen(t), { ok: !0, isFullscreen: t };
});
s.handle("window:set-fullscreen", async (t, n) => e ? (e.setFullScreen(!!n), { ok: !0, isFullscreen: e.isFullScreen() }) : { ok: !1, isFullscreen: !1 });
s.handle("window:is-fullscreen", async () => e ? { ok: !0, isFullscreen: e.isFullScreen() } : { ok: !1, isFullscreen: !1 });
