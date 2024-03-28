import { app, shell, BrowserWindow, ipcMain, nativeTheme, dialog } from 'electron'
import fs from 'fs'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { exec, spawn } from 'child_process'
import fixPath from 'fix-path';
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
  // ipcMain.on('wallpaper:url', async (_, path) => {
  //   downloadFileToFolder(path)
  // })

  // 创建文件
  const filePath = join(app.getPath('userData'), '/bat')
  fs.mkdir(filePath, { recursive: true }, error => {
    if (error) console.log(`mkdir path: ${filePath} err`)
  })

  // 设置壁纸
  ipcMain.on('wallpaper:change', async (_, url) => {
    let path: string = await downloadFileToFolder(url) as string
    if (path === '') return
    fixPath();
    // mac系统
    if (process.platform === 'darwin') {
      const wallPaperCommand = `osascript -e 'tell application "Finder" to set desktop picture to POSIX file "${path}"'`
      exec(wallPaperCommand, (error) => {
        if (error) {
          mainWindow.webContents.send('wallpaper:status', false)
        } else {
          mainWindow.webContents.send('wallpaper:status', true)
        }
      })
    }
    // window系统
    if (process.platform === 'win32') {
      const command = `@echo off 
      set regadd=reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System"
      %regadd% /v TileWallpaper /d "0" /f 
      %regadd% /v Wallpaper /d "${path.replaceAll('/', '\\')}" /f
      %regadd% /v WallpaperStyle /d "2" /f 
      RunDll32.exe USER32.DLL,UpdatePerUserSystemParameters
      exit`
      const commandPs1 = `$imgPath="${path.replaceAll('/', '\\')}"\n$code = @'\nusing System.Runtime.InteropServices;\nnamespace Win32{

        public class Wallpaper{
           [DllImport("user32.dll", CharSet=CharSet.Auto)]
            static extern int SystemParametersInfo (int uAction , int uParam , string lpvParam , int fuWinIni);

            public static void SetWallpaper(string thePath){
               SystemParametersInfo(20,0,thePath,3);
            }
       }
    }\n'@\nadd-type $code\n#Apply the Change on the system\n[Win32.Wallpaper]::SetWallpaper($imgPath)`
      const filePath = join(app.getPath('userData'), '/bat', `/win.bat`)
      try {
        fs.writeFileSync(filePath, command, 'utf-8')
      } catch (e) {
        console.error('写入失败：', e)
      }
      const filePathPs1 = join(app.getPath('userData'), '/bat', `/win.ps1`)
      try {
        fs.writeFileSync(filePathPs1, commandPs1, 'utf-8')
      } catch (e) {
        console.error('写入失败：', e)
      }
      const child = spawn('powershell', [filePath], {shell: true})
      child.stdout.on("data", function (data) {
        console.log("Powershell Data: " + data);
        mainWindow.webContents.send('wallpaper:status', true)
      });
      child.stderr.on("data", function (data) {
        console.log("Powershell Errors: " + data);
        mainWindow.webContents.send('wallpaper:status', false)
        dialog.showErrorBox('提示', data)
      });
      child.on("exit", function () {
        console.log("Powershell Script finished");
      });
      child.stdin.end();
      const child1 = spawn('powershell', ['-ExecutionPolicy', 'ByPass', '-File', `${filePathPs1}`], {shell: true})
      child1.stdout.on("data", function (data) {
        console.log("Powershell Data1: " + data);
        mainWindow.webContents.send('wallpaper:status', true)
      });
      child1.stderr.on("data", function (data) {
        console.log("Powershell Errors1: " + data);
        mainWindow.webContents.send('wallpaper:status', false)
        dialog.showErrorBox('提示1', data)
      });
      child1.on("exit", function () {
        console.log("Powershell Script finished1");
      });
      child1.stdin.end();
      // exec(`powershell.exe -ExecutionPolicy Bypass ${filePath}`, (error) => {
      //   if (error) {
      //     mainWindow.webContents.send('wallpaper:status', false)
      //   } else {

      //     const filePathPs1 = join(app.getPath('userData'), '/bat', `/win.ps1`)
      //     try {
      //       fs.writeFileSync(filePathPs1, commandPs1, 'utf-8')
      //     } catch (e) {
      //       console.error('写入失败：', e)
      //     }
      //     spawn('powershell.exe', ['-ExecutionPolicy', 'ByPass', '-File', `${filePathPs1}`])
      //     // exec(`powershell.exe -ExecutionPolicy Bypass ${filePathPs1}`, (error) => {
      //     //   if (error) {
      //     //     mainWindow.webContents.send('wallpaper:status', false)
      //     //   } else {
      //     //     mainWindow.webContents.send('wallpaper:status', true)
      //     //   }
      //     // })
      //   }
      // });
    }
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

// 下载网络图片到本地
function downloadFileToFolder(url: string) {
  return new Promise((resolve, reject) => {
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
          resolve(filePath || '')
        } else {
          reject('')
        }
      })
    })
  })
}