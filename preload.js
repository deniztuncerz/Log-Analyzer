const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Dosya İşlemleri ──────────────────────────────
  openFile: () => ipcRenderer.invoke('dialog:open-file'),

  saveFile: (data, defaultName, filters) =>
    ipcRenderer.invoke('dialog:save-file', { data, defaultName, filters }),

  // ── Veritabanı İşlemleri ─────────────────────────
  saveToDB: (logData) => ipcRenderer.invoke('db:save-log', logData),

  listLogs: () => ipcRenderer.invoke('db:list-logs'),

  loadLog: (logFileId) => ipcRenderer.invoke('db:load-log', logFileId),

  deleteLog: (logFileId) => ipcRenderer.invoke('db:delete-log', logFileId),

  saveNote: (serial, noteText) => ipcRenderer.invoke('db:save-note', { serial, noteText }),

  getNote: (serial) => ipcRenderer.invoke('db:get-note', serial),

  saveCustomer: (serial, nameText) => ipcRenderer.invoke('db:save-customer', { serial, nameText }),

  getCustomer: (serial) => ipcRenderer.invoke('db:get-customer', serial),
  renameSerial: (oldSerial, newSerial) => ipcRenderer.invoke('db:rename-serial', oldSerial, newSerial),

  // ── DB Durum Kontrolü ────────────────────────────
  isDBAvailable: () => ipcRenderer.invoke('db:is-available')
});
