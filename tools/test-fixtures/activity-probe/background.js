// Dev-only probe: emits steady network traffic so the extension-activity
// panel has observable per-extension activity to display.
function ping() {
  fetch("https://example.com/?probe=" + Date.now())
    .then((r) => console.log("[activity-probe] fetched", r.status))
    .catch((e) => console.error("[activity-probe]", String(e)));
}
setTimeout(ping, 500);
setInterval(ping, 3000);
browser.runtime.onMessage.addListener((msg) => {
  if (msg && msg.probe === true) {
    return Promise.resolve({ probe: true, t: Date.now() });
  }
  return undefined;
});
