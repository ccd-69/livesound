!macro customUnInstall
  # Deep clean: remove local app data and updater cache that deleteAppDataOnUninstall might miss
  RMDir /r "$LOCALAPPDATA\LiveSound"
  RMDir /r "$LOCALAPPDATA\livesound-updater"
  RMDir /r "$APPDATA\livesound-updater"
  Delete "$DESKTOP\LiveSound.lnk"
!macroend
