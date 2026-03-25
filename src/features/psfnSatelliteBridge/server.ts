import type { NextApiResponse } from "next";

import type { SatelliteBridgeEvent } from "./types";

export const satelliteBridgeClients: Array<{ res: NextApiResponse }> = [];

export function addSatelliteBridgeClient(res: NextApiResponse): { res: NextApiResponse } {
  const client = { res };
  satelliteBridgeClients.push(client);
  return client;
}

export function removeSatelliteBridgeClient(client: { res: NextApiResponse }): void {
  const index = satelliteBridgeClients.indexOf(client);
  if (index >= 0) {
    satelliteBridgeClients.splice(index, 1);
  }
}

export function sendSatelliteBridgeEvent(event: SatelliteBridgeEvent): void {
  const payload = JSON.stringify(event);
  for (const client of satelliteBridgeClients) {
    client.res.write(`data: ${payload}\n\n`);
  }
}
