import { fetchAlarms } from "../queries/index.js";
import { database, container } from "../app.js";

class MapContainer extends HTMLElement {
  constructor() {
    super();
    this.mapView = null;
    this.subscriptionId = null;
    this.anchorLocationId = null;
    this.interval = null;
    this.lastUpdate = null;
  }

  connectedCallback() {
    this.innerHTML = `
      <style>
        #map-container {
        }

        #info {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          display: none;
        }

        #info h1 {
          font-size: 2em;
          margin-bottom: .5em;
        }
      </style>
      <section id="map-container">
        <div id="info">
          <h1>No active alarm</h1>
          <p>
            There are no active alarms available. Please activate an alarm using the app.
          </p>
        </div>
      </div>
    `;

    this.containerElement = this.querySelector("#map-container");
    this.infoElement = this.querySelector("#info");

    window.addEventListener("user-logged-in", () => this.init());
    window.addEventListener("user-logged-out", () => this.removeMap());
    window.addEventListener("alarm-activated", (event) =>
      this.addMap(event.detail)
    );
    window.addEventListener("alarm-deactivated", (event) => this.removeMap());
  }

  addMap(alarm) {
    console.log("addMap:", alarm);
    if (this.mapView) {
      // If we already have the same alarm added we don't
      // want to do anything.
      if (this.anchorLocationId === alarm.recordName) {
        return;
      }
      // Remove map
      this.removeMap();
    }
    const mapView = document.createElement("map-view");
    // Add the alarm to the mapView component
    mapView.alarm = alarm;
    this.mapView = mapView;
    this.containerElement.appendChild(mapView);
    const event = new CustomEvent("alarm-activated", { detail: alarm });
    this.mapView.dispatchEvent(event);
  }

  removeMap() {
    this.containerElement.removeChild(this.mapView);
    this.mapView = null;
  }

  async init() {
    //await this.setupCloudKitSubscription();
    // Add a fallback to every n seconds if no update has happened in a while
    if (!this.interval) {
      this.interval = setInterval(async () => {
        console.log("interval");
        // If we have an anchorLocationId we want to poll less often since we just
        // want to automatically remove the map after an alarm is stopped, users are
        // less likely to have the website open in that point.
        if (
          (this.lastUpdate === null ||
            Date.now() - this.lastUpdate > 30 * 1000) &&
          this.anchorLocationId
        ) {
          console.log("active alarm");
          await this.loadAlarms();
        }

        // If we don't have active anchorLocationId we want to poll often so that the
        // websites updates quicly after they activate an alarm
        if (
          (this.lastUpdate === null ||
            Date.now() - this.lastUpdate > 3 * 1000) &&
          !this.anchorLocationId
        ) {
          console.log("no active alarm");
          await this.loadAlarms();
        }
      }, 1000);
    }
    await this.loadAlarms();
  }

  // Responsible for loading alarms from CloudKit and if we find an active one
  // we want to add the map
  async loadAlarms() {
    this.lastUpdate = Date.now();
    const alarms = await fetchAlarms();

    if (!alarms.length) {
      // Show message about no active alarms
      this.infoElement.style.display = "block";
      this.deselectAlarm();
      return;
    }

    // Search for active alarms
    const activeAlarm = alarms.find((a) => {
      return a.fields.CD_statusRaw.value == "active";
    });

    if (!activeAlarm) {
      // Show message about no active alarms
      this.infoElement.style.display = "block";
      this.deselectAlarm();
      return;
    }

    this.selectAlarm(activeAlarm);
  }

  deselectAlarm() {
    if (this.anchorLocationId) {
      // Show message about no active alarms
      this.infoElement.style.display = "block";
      const event = new CustomEvent("alarm-deactivated");
      this.anchorLocationId = null;
      window.dispatchEvent(event);
    }
  }

  selectAlarm(alarm) {
    const event = new CustomEvent("alarm-activated", { detail: alarm });
    this.anchorLocationId = alarm.recordName;
    window.dispatchEvent(event);
  }

  async setupCloudKitSubscription() {
    console.log("setupCloudKitSubscription");
    // Fetch all existing subscriptions first
    const existingSubscriptions = await this.fetchOldSubscriptions();
    console.log("existingSubscriptions:", existingSubscriptions);

    // Delete all subscriptions that match the query for CD_VesselLocation
    if (existingSubscriptions.length) {
      await this.deleteSubscriptions(existingSubscriptions);
    }

    // Now create a new subscription for CD_VesselLocation
    const subscription = {
      subscriptionType: "query",
      zoneID: { zoneName: "com.apple.coredata.cloudkit.zone" },
      firesOn: ["create", "update", "delete"],
      notificationInfo: {
        alertBody: "An update to the active alarm",
      },
      query: {
        recordType: "CD_AnchorLocation",
        filterBy: [
          {
            fieldName: "CD_statusRaw",
            comparator: "EQUALS",
            fieldValue: { value: "active" },
          },
        ],
        sortBy: [{ fieldName: "CD_timestamp", ascending: false }],
      },
    };

    try {
      // Add the subscription to CloudKit
      const response = await database.saveSubscriptions(subscription);
      this.subscriptionId = response.subscriptionID; // Store the subscription ID
      this.setupCloudKitNotifications();
    } catch (error) {
      console.error("Error adding CloudKit subscription:", error);
    }
  }

  async setupCloudKitNotifications() {
    const currentSubscriptionId = this.subscriptionId;
    container.addNotificationListener((notification) => {
      console.log("UPDATE TO ALARMS:", notification);
      if (notification?.subscriptionID === currentSubscriptionId) {
        console.log("loadAlarms");
        this.loadAlarms.call(this);
      }
    });
  }

  async fetchOldSubscriptions() {
    try {
      // Fetch all existing subscriptions
      const response = await database.fetchAllSubscriptions();
      if (!response.subscriptions) {
        return [];
      }
      const querySubscriptions = response.subscriptions
        .filter((s) => {
          return (
            s.subscriptionType === "query" &&
            s.query.recordType === "CD_AnchorLocation"
          );
        })
        .map((s) => s.subscriptionID);
      return querySubscriptions;
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      return [];
    }
  }

  async deleteSubscriptions(subscriptionIds) {
    try {
      // Loop through the subscriptions and delete those related to the CD_AnchorLocation query
      await database.deleteSubscriptions(subscriptionIds);
    } catch (error) {
      console.error("Error deleting subscriptions:", error);
    }
  }
}

customElements.define("map-container", MapContainer);
