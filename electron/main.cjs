const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let apiProcess = null;

function startBackend() {
  const isDev = !app.isPackaged;
  if (!isDev) {
    const apiPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'api');
    try {
      apiProcess = fork(path.join(apiPath, 'dist', 'index.js'), [], {
        cwd: apiPath,
        env: {
          ...process.env,
          PORT: 8081
        }
      });
      console.log('Started local API process for Muzlix');
    } catch (e) {
      console.error('Failed to start API:', e);
    }
  }
}

function createWindow() {
  const isDev = !app.isPackaged;
  const iconPath = path.join(__dirname, '..', isDev ? 'public' : 'dist', 'logo.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'MUZLIX',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // Optionally disable webSecurity if cross-origin issues persist
      devTools: isDev, // Disable devtools completely in production
    },
    autoHideMenuBar: true,
  });

  // Completely remove the top menu to prevent accessing 'View -> Developer Tools'
  mainWindow.setMenu(null);

  // Prevent keyboard shortcuts for Developer Tools in production
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (!isDev) {
      if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        event.preventDefault();
      }
    }
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

  // Bypass Anti-Adblock popup detection by allowing the window but making it invisible and closing it instantly
  mainWindow.webContents.setWindowOpenHandler((details) => {
    return { 
      action: 'allow',
      overrideBrowserWindowOptions: {
        show: false, // Create popup invisibly
        width: 0,
        height: 0
      }
    };
  });

  mainWindow.webContents.on('did-create-window', (childWindow) => {
    // Instantly close the invisible ad popup so the user never sees it
    childWindow.close();
  });

  // Removed network-level ad blocker to prevent Anti-Adblock detection.
  // The invisible popup closer above is enough to protect the user from intrusive ads.

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
  startBackend();
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
  if (apiProcess) {
    try {
      apiProcess.kill();
    } catch (e) {}
  }
  if (process.platform !== 'darwin') app.quit();
});
