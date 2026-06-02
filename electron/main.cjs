const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'Nonton Desktop',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // Optionally disable webSecurity if cross-origin issues persist
    },
    autoHideMenuBar: true,
  });

  // Intercept headers to bypass iframe blocking (CSP & X-Frame-Options)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = Object.assign({}, details.responseHeaders);
    
    // Remove headers that block iframes
    const headersToRemove = ['content-security-policy', 'x-frame-options'];
    
    for (const header of Object.keys(responseHeaders)) {
      if (headersToRemove.includes(header.toLowerCase())) {
        delete responseHeaders[header];
      }
    }
    
    callback({
      cancel: false,
      responseHeaders: responseHeaders
    });
  });

  // Block popups and new windows (often triggered by ad clicks on streaming sites)
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Block common ad networks and tracking scripts
  const adBlockPatterns = [
    '*://*.doubleclick.net/*',
    '*://*.googleadservices.com/*',
    '*://*.googlesyndication.com/*',
    '*://*.popads.net/*',
    '*://*.popcash.net/*',
    '*://*.exoclick.com/*',
    '*://*.propellerads.com/*',
    '*://*.onclickads.net/*',
    '*://*.histats.com/*',
    '*://*.adsterratools.com/*',
    '*://*.profitabledisplaynetwork.com/*',
    '*://*.highcpmrevenuenetwork.com/*',
    '*://*.clksite.com/*',
    '*://*.realsrv.com/*',
  ];

  session.defaultSession.webRequest.onBeforeRequest({ urls: adBlockPatterns }, (details, callback) => {
    callback({ cancel: true });
  });

  // Load Vite dev server URL in development, or index.html in production
  const isDev = !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('search-movies', async (event, query, page) => {
    return new Promise((resolve) => {
      const hiddenWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      let isResolved = false;

      hiddenWindow.webContents.on('did-finish-load', async () => {
        if (isResolved) return;
        try {
          const jsonText = await hiddenWindow.webContents.executeJavaScript('document.body.innerText');
          const data = JSON.parse(jsonText);
          isResolved = true;
          resolve(data);
          if (!hiddenWindow.isDestroyed()) hiddenWindow.close();
        } catch (err) {
          // If JSON parse fails, it means we are likely on a Cloudflare challenge page.
          // Do nothing and wait for it to auto-reload.
          console.log('Waiting for Cloudflare challenge to pass...');
        }
      });

      // Timeout just in case Cloudflare blocks us permanently
      setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          if (!hiddenWindow.isDestroyed()) hiddenWindow.close();
          resolve({ data: [] });
        }
      }, 15000);

      hiddenWindow.loadURL(`https://gudangvape.com/search.php?s=${encodeURIComponent(query)}&page=${page}`);
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
