// SPDX-License-Identifier: MPL-2.0
import type { JSX } from "solid-js";
import styles from "./styles.css?inline";

export function StyleElement(): JSX.Element {
  return <style>{styles}</style>;
}
