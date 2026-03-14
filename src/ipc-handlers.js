/**
 * IPC Handler'ları — Electron main process'te çalışır
 * Renderer (preload.js) ile dosya depolama arasında köprü görevi görür.
 */

function registerIpcHandlers(ipcMain, storage) {
  // ── Depolama kullanılabilirlik kontrolü ────────
  ipcMain.handle('db:is-available', async () => {
    return !!storage;
  });

  // ── Log Kaydet ────────────────────────────────
  ipcMain.handle('db:save-log', async (event, logData) => {
    if (!storage) return { success: false, error: 'Depolama modülü yok' };
    try {
      const { serial, filename, kwLimit, rawContent, evLog, dtLog, analysis } = logData;
      const result = storage.saveLogFile(serial, filename, kwLimit, rawContent, evLog, dtLog, analysis);
      return result;
    } catch (err) {
      console.error('Save error:', err);
      return { success: false, error: err.message };
    }
  });

  // ── Logları Listele ───────────────────────────
  ipcMain.handle('db:list-logs', async () => {
    if (!storage) return [];
    try {
      return storage.listLogFiles();
    } catch (err) {
      console.error('List error:', err);
      return [];
    }
  });

  // ── Log Yükle ─────────────────────────────────
  ipcMain.handle('db:load-log', async (event, logFileId) => {
    if (!storage) return null;
    try {
      return storage.loadLogFile(logFileId);
    } catch (err) {
      console.error('Load error:', err);
      return null;
    }
  });

  // ── Log Sil ───────────────────────────────────
  ipcMain.handle('db:delete-log', async (event, logFileId) => {
    if (!storage) return { success: false, error: 'Depolama yok' };
    try {
      return storage.deleteLogFile(logFileId);
    } catch (err) {
      console.error('Delete error:', err);
      return { success: false, error: err.message };
    }
  });

  // ── Not Kaydet ────────────────────────────────
  ipcMain.handle('db:save-note', async (event, { serial, noteText }) => {
    if (!storage) return { success: false, error: 'Depolama yok' };
    try {
      return storage.saveNote(serial, noteText);
    } catch (err) {
      console.error('Save note error:', err);
      return { success: false, error: err.message };
    }
  });

  // ── Not Getir ─────────────────────────────────
  ipcMain.handle('db:get-note', async (event, serial) => {
    if (!storage) return '';
    try {
      return storage.getNote(serial);
    } catch (err) {
      console.error('Get note error:', err);
      return '';
    }
  });

  // ── Müşteri Adı Kaydet ────────────────────────
  ipcMain.handle('db:save-customer', async (event, { serial, nameText }) => {
    if (!storage) return { success: false, error: 'Depolama yok' };
    try {
      return storage.saveCustomerName(serial, nameText);
    } catch (err) {
      console.error('Save customer error:', err);
      return { success: false, error: err.message };
    }
  });

  // ── Müşteri Adı Getir ─────────────────────────
  ipcMain.handle('db:get-customer', async (event, serial) => {
    if (!storage) return '';
    try {
      return storage.getCustomerName(serial);
    } catch (err) {
      console.error('Get customer error:', err);
      return '';
    }
  });

  // ── Seri Numarası Yeniden Adlandır ───────────────
  ipcMain.handle('db:rename-serial', async (event, oldSerial, newSerial) => {
    if (!storage) return { success: false, error: 'Depolama yok' };
    try {
      return storage.renameSerial(oldSerial, newSerial);
    } catch (err) {
      console.error('Rename serial error:', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = registerIpcHandlers;
