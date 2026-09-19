/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { JSXElement } from "solid-js";

/** Injected once into document.head by BrowserActionUtils. */
export function StyleElement(): JSXElement {
  return <style>{css}</style>;
}

const css = String.raw`
#vpn-toggle-button .toolbarbutton-text {
  font-weight: 600;
}
#vpn-toggle-button[state="on"] .toolbarbutton-text {
  color: #1faa59;
}
#vpn-toggle-button[state="off"] .toolbarbutton-text {
  color: #9a9aa2;
}
`;
