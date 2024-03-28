import { app, shell, BrowserWindow, ipcMain, nativeTheme, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { exec } from 'child_process'
import icon from '../../resources/icon.png?asset'
app.commandLine.appendSwitch('disable-web-security')
let mainWindow: BrowserWindow

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 400,
    height: 450,
    show: false,
    resizable: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  })

  // mainWindow.webContents.openDevTools()

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  console.log('App is ready')
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 设置主题色
  nativeTheme.themeSource = 'system'

  // 下载
  ipcMain.on('wallpaper:url', async (_, path) => {
    downloadFileToFolder(path)
  })

  // 设置壁纸
  ipcMain.on('wallpaper:change', async (_, path) => {
    let wallPaperCommand = ''
    if (process.platform === 'darwin') {
      wallPaperCommand = `osascript -e 'tell application "Finder" to set desktop picture to POSIX file "${path}"'`
    }
    if (process.platform === 'win32') {
      wallPaperCommand = `REG ADD "HKCU\\Control Panel\\Desktop" /V Wallpaper /T REG_SZ /F /D ${path.replaceAll('/', '\\')} && REG ADD "HKCU\\Control Panel\\Desktop" /V WallpaperStyle /T REG_SZ /F /D 0 && REG ADD "HKCU\\Control Panel\\Desktop" /V TileWallpaper /T REG_SZ /F /D 1 && :: Make the changes effective immediately && %SystemRoot%\\System32\\RUNDLL32.EXE user32.dll, UpdatePerUserSystemParameters`
    }
    exec(wallPaperCommand, (error) => {
      if (error) {
        mainWindow.webContents.send('wallpaper:status', false)
      } else {
        mainWindow.webContents.send('wallpaper:status', true)
      }
    })
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

function downloadFileToFolder(url: string) {
  mainWindow.webContents.downloadURL(url)
  mainWindow.webContents.session.once('will-download', (_, item, webContents) => {
    const arr = url.split('.')
    const fileNameList = url.split('.')[arr.length - 2].split('/')
    // 文件名
    const fileName = fileNameList[fileNameList.length - 1]
    // 文件后缀
    const fileType = arr[arr.length - 1]
    // 保存路径
    const filePath = join(app.getPath('userData'), '/download', `${fileName}.${fileType}`)
    item.setSavePath(filePath)
    item.once('done', (_, state) => {
      if (state === 'completed') {
        webContents.send('wallpaper:done', filePath)
      }
    })
  })
}