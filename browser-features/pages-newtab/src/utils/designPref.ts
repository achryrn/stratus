import { rpc } from "@/lib/rpc/rpc.ts";

// Helper to get current disableStratusStart flag from stratus.design.configs
export async function getDisableStratusStart(): Promise<boolean> {
  try {
    const result = await rpc.getStringPref("stratus.design.configs");
    if (!result) return false;
    const data = JSON.parse(result);
    return !!data?.uiCustomization?.disableStratusStart;
  } catch (e) {
    console.error("Failed to get disableStratusStart:", e);
    return false;
  }
}

// Update only the disableStratusStart flag while preserving other configs
export async function setDisableStratusStart(disabled: boolean): Promise<void> {
  try {
    const result = await rpc.getStringPref("stratus.design.configs");
    if (!result) return; // can't update if base config missing
    const data = JSON.parse(result);
    if (!data.uiCustomization) data.uiCustomization = {};
    data.uiCustomization.disableStratusStart = disabled;
    await rpc.setStringPref("stratus.design.configs", JSON.stringify(data));
  } catch (e) {
    console.error("Failed to set disableStratusStart:", e);
  }
}