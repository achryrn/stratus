/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { noraComponent, NoraComponentBase } from "#features-chrome/utils/base";

@noraComponent(import.meta.hot)
export default class VerticalTabsFeature extends NoraComponentBase {
  init(): void {
    this.logger.debug("Initializing vertical tabs feature");
    this.registerToggleCommand();
  }

  private registerToggleCommand(): void {
    // Register the vertical tabs toggle command as a global action
    (globalThis as any).toggleVerticalTabs = () => {
      try {
        const config = require("#features-chrome/designs/configs").config;
        const currentStyle = config().tabbar.tabbarStyle;
        const newStyle = currentStyle === "vertical" ? "horizontal" : "vertical";
        
        // Update pref
        Services.prefs.setCharPref("floorp.tabbar.style.current", newStyle);
        
        this.logger.info(`Switched tab style from "${currentStyle}" to "${newStyle}"`);
      } catch (e) {
        this.logger.error("Failed to toggle vertical tabs:", e);
      }
    };

    // Register keyboard shortcut (Ctrl+Shift+V)
    this.registerKeyboardShortcut();
  }

  private registerKeyboardShortcut(): void {
    try {
      const key = globalThis.document.createElement("key");
      key.id = "key_toggleVerticalTabs";
      key.setAttribute("key", "V");
      key.setAttribute("modifiers", "control shift");
      key.setAttribute("oncommand", "(globalThis as any).toggleVerticalTabs()");
      
      const mainKeyset = globalThis.document.getElementById("mainKeyset");
      if (mainKeyset) {
        mainKeyset.appendChild(key);
        this.logger.debug("Registered Ctrl+Shift+V shortcut for vertical tabs toggle");
      }
    } catch (e) {
      this.logger.error("Failed to register keyboard shortcut:", e);
    }
  }
}
