/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const getOldInterfaceConfig = () => {
  switch (Services.prefs.getIntPref("floorp.browser.user.interface", 0)) {
    case 3:
      switch (Services.prefs.getIntPref("floorp.lepton.interface", 0)) {
        case 1:
          return "photon";
        case 3:
          return "protonfix";
        default:
          return "lepton";
      }
    case 8:
      return "fluerial";
  }

  return "lepton";
};

export const getOldTabbarStyleConfig = () => {
  // First check new string-based pref (M4 vertical tabs feature)
  try {
    const newStylePref = Services.prefs.getCharPref(
      "floorp.tabbar.style.current",
      "",
    );
    if (newStylePref === "vertical" || newStylePref === "multirow" || newStylePref === "horizontal") {
      return newStylePref;
    }
  } catch {
    // Pref doesn't exist yet, fall through to old int-based pref
  }

  // Fall back to old int-based pref for backward compatibility
  switch (Services.prefs.getIntPref("floorp.tabbar.style", 0)) {
    case 1:
      return "multirow";
    case 2:
      return "vertical";
    default:
      return "horizontal";
  }
};

export const getOldTabbarPositionConfig = () => {
  switch (Services.prefs.getIntPref("floorp.browser.tabbar.settings", 0)) {
    case 1:
      return "hide-horizontal-tabbar";
    case 2:
      return "optimise-to-vertical-tabbar";
    case 3:
      return "bottom-of-navigation-toolbar";
    case 4:
      return "bottom-of-window";
    default:
      return "default";
  }
};
