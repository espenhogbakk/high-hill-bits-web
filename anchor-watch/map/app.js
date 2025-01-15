"use strict";

// TODO - cleanup subscriptions (do we need them or is polling just as good?)
// TODO - remove interval if no active alarm
// TODO - Verify that alarm is active, and if not cleanup ^
// TODO - Draw correct alarm zone
// TODO - Draw polyline with correct colors
// TODO - Draw zone with correct colors
// TODO - Test out service-workers and push notifications even if app is in background

import { CLOUDKIT_CONFIG } from "./config.js";

CloudKit.configure({
  containers: [
    {
      containerIdentifier: CLOUDKIT_CONFIG.containerIdentifier,
      apiTokenAuth: {
        apiToken: CLOUDKIT_CONFIG.apiToken,
        persist: true,
      },
      environment: CLOUDKIT_CONFIG.environment,
    },
  ],
});

export const container = CloudKit.getDefaultContainer();
export const database = container.privateCloudDatabase;

export async function initializeAuth() {
  const userIdentity = await container.setUpAuth();
  return userIdentity;
}
