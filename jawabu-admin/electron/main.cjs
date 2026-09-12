const { app, BrowserWindow, shell, session } = require('electron');
const fs = require('fs');
const path = require('path');

const isDev = !app.isPackaged;
const DEV_URL = process.env.SLEEK_ADMIN_DEV_URL || 'http://127.0.0.1:5176';
const APP_USER_MODEL_ID = 'com.sleeksisters.admin';

function appIconPath() {
  return path.join(__dirname, 'icon.ico');
}

function ensureDesktopShortcut() {
  if (isDev || process.platform !== 'win32') {
    return;
  }

  const shortcutPath = path.join(app.getPath('desktop'), 'Sleek Sisters Admin.lnk');
  if (fs.existsSync(shortcutPath)) {
    return;
  }

  shell.writeShortcutLink(shortcutPath, 'create', {
    target: process.execPath,
    cwd: path.dirname(process.execPath),
    args: '',
    icon: process.execPath,
    iconIndex: 0,
    description: 'Sleek Sisters Admin',
    appUserModelId: APP_USER_MODEL_ID,
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    title: 'Sleek Sisters Admin',
    backgroundColor: '#111111',
    autoHideMenuBar: true,
    icon: appIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev
      ? url.startsWith(DEV_URL)
      : url.startsWith('file://');
    if (!allowed && !url.startsWith('https://lerdicfcjfbdxfbjgiri.supabase.co')) {
      event.preventDefault();
      if (url.startsWith('https://')) {
        shell.openExternal(url);
      }
    }
  });

  if (isDev) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.setAppUserModelId(APP_USER_MODEL_ID);

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  if (!isDev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:;",
          ],
        },
      });
    });
  }

  ensureDesktopShortcut();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
