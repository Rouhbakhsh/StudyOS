const { app, BrowserWindow, ipcMain, net, protocol, session, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const DEV_URL = 'http://localhost:5173';
const useDevServer = !app.isPackaged || process.argv.includes('--dev');
const DIST_DIR = path.join(__dirname, 'dist');

// رابط اپ کاملاً انگلیسی است، حتی اگر زبان ویندوز فارسی باشد (منوها، دیالوگ‌ها، فرمت تاریخ)
app.commandLine.appendSwitch('lang', 'en-US');

// داده‌های نسخه توسعه جدا از داده‌های واقعی نگه داشته می‌شوند
if (!app.isPackaged) {
  app.setPath('userData', path.join(app.getPath('appData'), 'StudyOS-dev'));
}

const DATA_DIR = app.getPath('userData');
const DATA_FILE = path.join(DATA_DIR, 'studyos-data.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS = 30;

// پروتکل app:// تا fetch و فایل‌های صوتی مثل یک سایت معمولی کار کنند (file:// اجازه fetch نمی‌دهد)
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

/* ---------------------------------------------------------
   ذخیره‌سازی فایل داده
   --------------------------------------------------------- */

function localDateString(d = new Date()) {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

// نوشتن در فایل موقت و جایگزینی، تا قطع برق یا بسته شدن ناگهانی فایل اصلی را نصفه نگذارد
function writeFileAtomic(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, content, 'utf8');
  try {
    fs.renameSync(tmp, file);
  } catch {
    fs.copyFileSync(tmp, file);
    fs.rmSync(tmp, { force: true });
  }
}

// یک نسخه پشتیبان در روز، قبل از اولین تغییر همان روز؛ ۳۰ نسخه آخر نگه داشته می‌شود
function ensureDailyBackup() {
  if (!fs.existsSync(DATA_FILE)) return;
  const target = path.join(BACKUP_DIR, `studyos-${localDateString()}.json`);
  if (fs.existsSync(target)) return;

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.copyFileSync(DATA_FILE, target);

  const backups = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => /^studyos-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  for (const old of backups.slice(0, Math.max(0, backups.length - MAX_BACKUPS))) {
    fs.rmSync(path.join(BACKUP_DIR, old), { force: true });
  }
}

function saveState(json) {
  if (typeof json !== 'string' || !json) return;
  try {
    ensureDailyBackup();
  } catch (err) {
    console.error('Daily backup failed:', err);
  }
  writeFileAtomic(DATA_FILE, json);
}

function loadState() {
  if (!fs.existsSync(DATA_FILE)) return null;
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    JSON.parse(raw);
    return raw;
  } catch {
    // فایل خراب کنار گذاشته می‌شود (پاک نمی‌شود) و اپ از نسخه پشتیبان قابل بازیابی است
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.renameSync(DATA_FILE, path.join(DATA_DIR, `studyos-data.corrupt-${stamp}.json`));
    return null;
  }
}

ipcMain.handle('state:load', () => loadState());
ipcMain.handle('state:save', (_event, json) => saveState(json));
ipcMain.on('state:save-sync', (event, json) => {
  try {
    saveState(json);
    event.returnValue = true;
  } catch (err) {
    console.error('Sync save failed:', err);
    event.returnValue = false;
  }
});
ipcMain.handle('data:info', () => ({ dataFile: DATA_FILE, backupDir: BACKUP_DIR }));
ipcMain.handle('data:open-folder', async () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  await shell.openPath(DATA_DIR);
});

/* ---------------------------------------------------------
   پنجره اصلی
   --------------------------------------------------------- */

let mainWindow = null;

function serveDist(request) {
  const { pathname } = new URL(request.url);
  const relative = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
  const filePath = path.normalize(path.join(DIST_DIR, relative));
  if (!filePath.startsWith(DIST_DIR)) {
    return new Response('Forbidden', { status: 403 });
  }
  return net.fetch(pathToFileURL(filePath).toString());
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 950,
    minHeight: 650,
    title: 'StudyOS',
    backgroundColor: '#F4F6F0',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // لینک‌های خارجی در مرورگر سیستم باز می‌شوند، نه داخل اپ
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const appOrigin = useDevServer ? DEV_URL : 'app://studyos';
    if (!url.startsWith(appOrigin)) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });

  if (useDevServer) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadURL('app://studyos/index.html');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// فقط یک پنجره از اپ باز باشد تا دو نسخه هم‌زمان روی یک فایل داده ننویسند
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    protocol.handle('app', serveDist);

    // تنظیم CSP برای رفع وارنینگ‌های امنیتی در محیط توسعه
    if (useDevServer) {
      session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [
              "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://localhost:5173 ws://localhost:5173;",
            ],
          },
        });
      });
    }

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
