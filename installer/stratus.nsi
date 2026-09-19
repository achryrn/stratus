; Stratus Browser NSIS installer (M8.12 release pipeline).
; Build: tools/release/make-installer.ps1 (requires NSIS makensis).
; Packages the release bundle (dist/bin/floorp) into a per-machine or
; per-user install with uninstaller, shortcuts and registry entries.

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "x64.nsh"

!define APP_NAME "Stratus"
!define APP_VERSION "153.0.3"
!define APP_ID "{1B6A1C0E-57E2-4A9E-9C1E-8C1B7A2D6F90}"
!define APP_REG_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Stratus"

!ifndef STAGE_DIR
  !error "STAGE_DIR must point at the release bundle (set -DSTAGE_DIR=...)"
!endif

Name "${APP_NAME}"
OutFile "stratus-browser-installer.exe"
Unicode True
RequestExecutionLevel admin
InstallDir "$PROGRAMFILES64\Stratus"
InstallDirRegKey HKLM "${APP_REG_KEY}" "InstallLocation"
BrandingText "Stratus Browser"
SetCompressor /SOLID lzma

!define MUI_ABORTWARNING
!define MUI_ICON "${STAGE_DIR}\browser\chrome\icons\default\main-window.ico"
!define MUI_UNICON "${STAGE_DIR}\browser\chrome\icons\default\main-window.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "Stratus" SecMain
  SetOutPath "$INSTDIR"

  ; Whitelist the release bundle so updater & brand files survive.
  File "${STAGE_DIR}\application.ini"
  File "${STAGE_DIR}\platform.ini"
  File "${STAGE_DIR}\stratus.exe"
  File "${STAGE_DIR}\updater.exe"
  File "${STAGE_DIR}\default-browser-agent.exe"
  File /r "${STAGE_DIR}\browser"
  File /r "${STAGE_DIR}\dictionaries"
  File /r "${STAGE_DIR}\fonts"
  File /r "${STAGE_DIR}\hyphenation"
  File /r "${STAGE_DIR}\icons"
  File /r "${STAGE_DIR}\plugins"
  File /r "${STAGE_DIR}\distribution"

  ; Per-user vs per-machine is decided by the installer's elevation.
  WriteRegStr HKLM "${APP_REG_KEY}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "${APP_REG_KEY}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKLM "${APP_REG_KEY}" "Publisher" "Stratus"
  WriteRegStr HKLM "${APP_REG_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${APP_REG_KEY}" "UninstallString" "\"$INSTDIR\Uninstall.exe\""
  WriteRegStr HKLM "${APP_REG_KEY}" "DisplayIcon" "$INSTDIR\stratus.exe"
  WriteRegDWORD HKLM "${APP_REG_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "${APP_REG_KEY}" "NoRepair" 1
  WriteRegDWORD HKLM "${APP_REG_KEY}" "EstimatedSize" 262144

  ; Default browser registration hooks + shortcuts.
  StrCpy $0 "$SMPROGRAMS\Stratus.lnk"
  CreateShortCut "$0" "$INSTDIR\stratus.exe"
  CreateShortCut "$DESKTOP\Stratus.lnk" "$INSTDIR\stratus.exe"

  ; Uninstaller.
  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"
  Delete "$SMPROGRAMS\Stratus.lnk"
  Delete "$DESKTOP\Stratus.lnk"
  DeleteRegKey HKLM "${APP_REG_KEY}"
SectionEnd
