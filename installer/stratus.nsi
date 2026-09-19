; Stratus Browser NSIS installer (M8.12/M8.14 release pipeline).
; Build: tools/release/make-installer.ps1 (makensis) with -DSTAGE_DIR=...
; Per-user first: installs to %LOCALAPPDATA%\Programs\Stratus without
; elevation; system-wide registration is best-effort when elevated.

!include "MUI2.nsh"

!define APP_NAME "Stratus"
!define APP_VERSION "153.0.3"
!define APP_REG_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Stratus"

!ifndef STAGE_DIR
  !error "STAGE_DIR must point at the release bundle (set -DSTAGE_DIR=...)"
!endif

Name "${APP_NAME}"
OutFile "stratus-browser-installer.exe"
Unicode True
RequestExecutionLevel user
InstallDir "$LOCALAPPDATA\Programs\Stratus"
InstallDirRegKey HKCU "${APP_REG_KEY}" "InstallLocation"
BrandingText "Stratus Browser"
SetCompressor /SOLID lzma

!define MUI_ABORTWARNING
!ifndef MUI_ICON
  !define MUI_ICON "${STAGE_DIR}\browser\chrome\icons\default\main-window.ico"
!endif
!ifndef MUI_UNICON
  !define MUI_UNICON "${STAGE_DIR}\browser\chrome\icons\default\main-window.ico"
!endif

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "Stratus" SecMain
  SetOutPath "$INSTDIR"

  ; Release bundle: full copy except dev-only artifacts; the app binary
  ; ships as stratus.exe (the overlay dist names it floorp.exe).
  File /oname=stratus.exe "${STAGE_DIR}\floorp.exe"
  File /r /x floorp.exe /x noraneko-devdir /x installation_dir_layout "${STAGE_DIR}\*"

  ; Uninstall registration: HKCU always (per-user); HKLM when elevated.
  WriteRegStr HKCU "${APP_REG_KEY}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKCU "${APP_REG_KEY}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "${APP_REG_KEY}" "Publisher" "Stratus"
  WriteRegStr HKCU "${APP_REG_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${APP_REG_KEY}" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "${APP_REG_KEY}" "DisplayIcon" "$INSTDIR\stratus.exe"
  WriteRegDWORD HKCU "${APP_REG_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${APP_REG_KEY}" "NoRepair" 1
  WriteRegDWORD HKCU "${APP_REG_KEY}" "EstimatedSize" 262144

  ClearErrors
  WriteRegStr HKLM "${APP_REG_KEY}" "DisplayName" "${APP_NAME}"
  IfErrors skipHklm
  WriteRegStr HKLM "${APP_REG_KEY}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKLM "${APP_REG_KEY}" "Publisher" "Stratus"
  WriteRegStr HKLM "${APP_REG_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${APP_REG_KEY}" "UninstallString" "$INSTDIR\Uninstall.exe"
  skipHklm:

  StrCpy $0 "$SMPROGRAMS\Stratus.lnk"
  CreateShortCut "$0" "$INSTDIR\stratus.exe"
  CreateShortCut "$DESKTOP\Stratus.lnk" "$INSTDIR\stratus.exe"

  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"
  Delete "$SMPROGRAMS\Stratus.lnk"
  Delete "$DESKTOP\Stratus.lnk"
  DeleteRegKey HKCU "${APP_REG_KEY}"
  DeleteRegKey HKLM "${APP_REG_KEY}"
SectionEnd
