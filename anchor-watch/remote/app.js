"use strict";

// TODO - cleanup subscriptions (do we need them or is polling just as good?)
// TODO - remove interval if no active alarm
// TODO - Verify that alarm is active, and if not cleanup ^
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
//container.registerForNotifications();
export const database = container.privateCloudDatabase;

const defaultState = {
  activeAlarm: null,
  lastUpdate: null,
  userLoggedIn: false,
};

export let store = {
  ...defaultState,
};

export async function initializeAuth() {
  // Handle user signing in
  container.whenUserSignsIn().then((userIdentity) => {
    store.userLoggedIn = true;
    dispatchEvent(new CustomEvent("user-logged-in", { bubbles: true }));
  });

  // Handle user signing out
  container.whenUserSignsOut().then(() => {
    store = defaultState;
    dispatchEvent(new CustomEvent("user-logged-out", { bubbles: true }));
  });

  // Setup authentication using CloudKit
  const userIdentity = await container.setUpAuth();
  return userIdentity;
}

(async () => {
  await initializeAuth();
})();
