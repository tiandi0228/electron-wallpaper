import { app, BrowserWindow } from 'electron'
import fs from 'node:fs'
import { join } from 'node:path'
import { exec, spawn } from 'node:child_process'

let macChildProcess
let childProcess
let childProcess1

// 配置项
const EXECUTION_OPTIONS = {
  shell: true
}

// macos设置桌面壁纸
export function macWallpaper(mainWindow: BrowserWindow, path: string) {
  const wallPaperCommand = `osascript -e 'tell application "Finder" to set desktop picture to POSIX file "${path}"'`
  macChildProcess = exec(wallPaperCommand, (error) => {
    if (error) {
      mainWindow.webContents.send('wallpaper:status', false)
    } else {
      mainWindow.webContents.send('wallpaper:status', true)
    }
  })
}

// windows设置桌面壁纸
export function windowWallpaper(mainWindow: BrowserWindow, path: string) {
  // .bat用来设置桌面壁纸
  const command = `@echo off
    set regadd=reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System"
    %regadd% /v TileWallpaper /d "0" /f
    %regadd% /v Wallpaper /d "${path.replaceAll('/', '\\')}" /f
    %regadd% /v WallpaperStyle /d "2" /f
    RunDll32.exe USER32.DLL,UpdatePerUserSystemParameters
    exit`
  // .ps1用来刷新桌面
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

  childProcess = spawn('powershell', [filePath], EXECUTION_OPTIONS)
  childProcess.stdout.on('data', function (data) {
    console.log('Powershell Data: ' + data)
    mainWindow.webContents.send('wallpaper:status', true)
  })
  childProcess.stderr.on('data', function (data) {
    console.log('Powershell Errors: ' + data)
    mainWindow.webContents.send('wallpaper:status', false)
  })
  childProcess.on('exit', function () {
    console.log('Powershell Script finished')
  })
  childProcess.stdin.end()

  childProcess1 = spawn(
    'powershell',
    ['-ExecutionPolicy', 'ByPass', '-File', `${filePathPs1}`],
    EXECUTION_OPTIONS
  )
  childProcess1.stdout.on('data', function (data) {
    console.log('Powershell Data: ' + data)
    mainWindow.webContents.send('wallpaper:status', true)
  })
  childProcess1.stderr.on('data', function (data) {
    console.log('Powershell Errors: ' + data)
    mainWindow.webContents.send('wallpaper:status', false)
  })
  childProcess1.on('exit', function () {
    console.log('Powershell Script finished')
  })
  childProcess1.stdin.end()
}

// 停止子进程
export function stopChildProcess() {
  if (macChildProcess) {
    macChildProcess.kill()
  }
  if (childProcess && childProcess1) {
    childProcess.kill()
    childProcess1.kill()
  }
}

// 下载网络图片到本地
export function downloadFileToFolder(mainWindow: BrowserWindow, url: string) {
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
