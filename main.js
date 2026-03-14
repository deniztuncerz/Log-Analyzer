const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Dosya tabanlı depolama modülü
const storage = require('./src/db');
const registerIpcHandlers = require('./src/ipc-handlers');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: true,
    autoHideMenuBar: true,
    title: 'MPLUS Log Analyzer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile('log_analyzer.html');

  // Beyaz flash önlemi — ready-to-show'da göster
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Dış linkleri sistem tarayıcısında aç
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── IPC: Native File Dialog ─────────────────────
ipcMain.handle('dialog:open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'MPLUS Log Dosyası Seç',
    filters: [
      { name: 'Log Dosyaları', extensions: ['txt', 'log', 'TXT'] },
      { name: 'Tüm Dosyalar', extensions: ['*'] }
    ],
    properties: ['openFile', 'multiSelections']
  });

  if (result.canceled || !result.filePaths.length) return null;

  const files = result.filePaths.map(fp => ({
    name: path.basename(fp),
    content: fs.readFileSync(fp, 'utf-8')
  }));

  return files;
});

ipcMain.handle('dialog:save-file', async (event, { data, defaultName, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Dosya Kaydet',
    defaultPath: defaultName,
    filters: filters || [{ name: 'Tüm Dosyalar', extensions: ['*'] }]
  });

  if (result.canceled || !result.filePath) return false;

  if (typeof data === 'string' && data.startsWith('data:')) {
    const base64Data = data.split(',')[1];
    fs.writeFileSync(result.filePath, Buffer.from(base64Data, 'base64'));
  } else if (typeof data === 'string') {
    fs.writeFileSync(result.filePath, data, 'utf-8');
  } else {
    fs.writeFileSync(result.filePath, Buffer.from(data));
  }

  return result.filePath;
});

// ── App Lifecycle ───────────────────────────────
app.whenReady().then(() => {
  // Dosya depolamayı başlat (uygulama klasöründe)
  storage.init(app.getAppPath());
  console.log('Log depolama klasörü:', storage.getStoragePath());

  // IPC handler'larını kaydet
  registerIpcHandlers(ipcMain, storage);

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
