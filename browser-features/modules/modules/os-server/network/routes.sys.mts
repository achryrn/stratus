/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Network telemetry routes for the OS Server.
 *
 * - GET /network/summary -> current session snapshot (hosts/tabs/extensions)
 * - GET /network/events  -> SSE stream of live activity updates
 */

import type {
  NamespaceBuilder,
  StreamResult,
} from "../router.sys.mts";
import type { NetworkSnapshot } from "../../network-monitor/types.ts";
import {
  NetworkMonitor,
  NETWORK_UPDATED_TOPIC,
} from "../../network-monitor/NetworkMonitor.sys.mts";

export function registerNetworkRoutes(api: NamespaceBuilder): void {
  api.namespace("/network", (n: NamespaceBuilder) => {
    n.get<undefined, NetworkSnapshot>("/summary", () => ({
      status: 200,
      body: NetworkMonitor.snapshot(),
    }));

    n.get("/events", (_ctx) => {
      return {
        isStream: true,
        onConnect: (send, _close) => {
          // Replay recent events so late subscribers get context.
          const recent = NetworkMonitor.recentEvents(50);
          for (const ev of recent) {
            send(
              JSON.stringify({
                type: "network-event",
                timestamp: ev.timestamp,
                data: ev,
              }),
            );
          }

          const observer = {
            observe: (_subject: unknown, topic: string) => {
              if (topic === NETWORK_UPDATED_TOPIC) {
                const snap = NetworkMonitor.snapshot();
                send(
                  JSON.stringify({
                    type: "network-updated",
                    timestamp: Date.now(),
                    data: { summary: snap.summary },
                  }),
                );
              }
            },
          };

          try {
            Services.obs.addObserver(observer, NETWORK_UPDATED_TOPIC);
          } catch (e) {
            console.error(
              "[os-server] Failed to add observer for " + NETWORK_UPDATED_TOPIC + ":",
              e,
            );
          }

          return () => {
            try {
              Services.obs.removeObserver(observer, NETWORK_UPDATED_TOPIC);
            } catch {
              // ignore
            }
          };
        },
      } as StreamResult;
    });
  });
}
