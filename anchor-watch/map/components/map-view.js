import { fetchVesselLocations } from "../queries/index.js";
import { StatusColor } from "../lib/index.js";
import { MAPKIT_TOKEN } from "../config.js";
import { database, container } from "../app.js";

class MapView extends HTMLElement {
  constructor() {
    super();
    this.map = null;
    this._alarm = null;
    this.trackOverlay = null;
    this.trackInterval = null;
    this.shipOverlay = null;
    this.lastUpdate = null;
    this.subscriptionId = null;
  }

  connectedCallback() {
    this.innerHTML = `
      <style>
        #map {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
        }
      </style>

      <div id="map"></div>`;
    this.initMap();
  }

  set alarm(value) {
    this._alarm = value;
  }

  get alarm() {
    return this._data;
  }

  initMap() {
    mapkit.init({
      authorizationCallback: (done) => {
        done(MAPKIT_TOKEN);
      },
    });

    const alarm = this._alarm;
    const lat = alarm.fields.CD_latitude.value;
    const lon = alarm.fields.CD_longitude.value;
    const distance = alarm.fields.CD_distance?.value;
    const bigDistance = alarm.fields.CD_bigDistance?.value;
    const largestRadius = Math.max(distance, bigDistance);
    const anchorLocation = new mapkit.Coordinate(lat, lon);
    this.map = new mapkit.Map("map", {
      center: anchorLocation,
      cameraDistance: largestRadius * 2.5,
    });

    this.render();
  }

  async render() {
    // Draw the alarm zone on the map
    const alarm = this._alarm;
    const lat = alarm.fields.CD_latitude.value;
    const lon = alarm.fields.CD_longitude.value;

    const alarmCoordinate = new mapkit.Coordinate(lat, lon);
    this.map.center = alarmCoordinate;

    // Clear existing overlays
    this.map.overlays = [];

    // Create and add the circle overlay
    let overlay;
    switch (alarm.fields.CD_modeRaw.value) {
      case "simple": {
        overlay = this.createCircularShape(alarm);
        break;
      }
      case "advanced": {
        overlay = this.createAdvancedCircularShape(alarm);
        break;
      }
      default: {
        overlay = this.createCircularShape(alarm);
        break;
      }
    }
    this.map.addOverlay(overlay);

    // Center dot
    const centerDot = new mapkit.CircleOverlay(
      new mapkit.Coordinate(lat, lon),
      1
    );
    centerDot.style = new mapkit.Style({
      lineWidth: 0,
      fillColor: StatusColor.active,
      fillOpacity: 0.8,
    });
    this.map.addOverlay(centerDot);

    // Update the track
    this.updateTrack(alarm);
    this.initLiveUpdates(alarm);
  }

  async initLiveUpdates(alarm) {
    // Set up the CloudKit subscription for live updates
    await this.setupCloudKitSubscription(alarm);

    // Add a fallback to every n seconds if no update has happened in a while
    if (!this.trackInterval) {
      this.trackInterval = setInterval(() => {
        // Only update if last update is older than 20 seconds or if it's the first update
        if (
          this.lastUpdate === null ||
          Date.now() - this.lastUpdate > 20 * 1000
        ) {
          this.updateTrack(alarm);
        }
      }, 1000);
    }
  }

  async setupCloudKitSubscription(alarm) {
    // Fetch all existing subscriptions first
    const existingSubscriptions = await this.fetchOldSubscriptions();

    // Delete all subscriptions that match the query for CD_VesselLocation
    if (existingSubscriptions.length) {
      await this.deleteSubscriptions(existingSubscriptions);
    }

    // Now create a new subscription for CD_VesselLocation
    const subscription = {
      subscriptionType: "query",
      zoneID: { zoneName: "com.apple.coredata.cloudkit.zone" },
      firesOn: ["create"],
      notificationInfo: {
        alertBody: "A new vessel location was added",
      },
      query: {
        recordType: "CD_VesselLocation",
        filterBy: [
          {
            fieldName: "CD_anchorLocation",
            comparator: "EQUALS",
            fieldValue: { value: alarm.recordName },
          },
        ],
        sortBy: [{ fieldName: "CD_timestamp", ascending: false }],
      },
    };

    try {
      // Add the subscription to CloudKit
      const response = await database.saveSubscriptions(subscription);
      this.subscriptionId = response.subscriptionID; // Store the subscription ID
      this.setupCloudKitNotifications(alarm);
    } catch (error) {
      console.error("Error adding CloudKit subscription:", error);
    }
  }

  async setupCloudKitNotifications(alarm) {
    const currentSubscriptionId = this.subscriptionId;
    const updateTrack = this.updateTrack;
    container.addNotificationListener((notification) => {
      if (notification?.subscriptionID === currentSubscriptionId) {
        updateTrack.call(this, alarm);
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
            s.query.recordType === "CD_VesselLocation"
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
      // Loop through the subscriptions and delete those related to the CD_VesselLocation query
      await database.deleteSubscriptions(subscriptionIds);
    } catch (error) {
      console.error("Error deleting subscriptions:", error);
    }
  }

  createCircularShape(alarm) {
    const lat = alarm.fields.CD_latitude.value;
    const lon = alarm.fields.CD_longitude.value;
    const radius = alarm.fields.CD_distance.value;

    const circle = new mapkit.CircleOverlay(
      new mapkit.Coordinate(lat, lon),
      radius
    );
    // We can modify this style after it's added as an overlay
    // and mapkit should re-render it...
    circle.style = new mapkit.Style({
      lineWidth: 2,
      strokeColor: StatusColor.active,
      fillColor: StatusColor.active,
      fillOpacity: 0.3,
    });

    return circle;
  }

  createShipOverlay(coordinate) {
    const shipOverlay = new mapkit.CircleOverlay(coordinate, 1);
    // We can modify this style after it's added as an overlay
    // and mapkit should re-render it...
    shipOverlay.style = new mapkit.Style({
      lineWidth: 2,
      strokeColor: "#FFFFFF",
      fillColor: "#5856CF",
      fillOpacity: 1,
    });

    return shipOverlay;
  }

  createAdvancedCircularShape(alarm) {
    const lat = alarm.fields.CD_latitude.value;
    const lon = alarm.fields.CD_longitude.value;
    const distance = alarm.fields.CD_distance.value;
    const bigDistance = alarm.fields.CD_bigDistance.value;
    const startAngle = alarm.fields.CD_startAngle.value;
    const endAngle = alarm.fields.CD_endAngle.value;

    function calculateNumPoints(radius, resolution = 2) {
      const minPoints = 100; // Minimum number of points for small circles
      return Math.max(
        minPoints,
        Math.round((2 * Math.PI * radius) / resolution)
      );
    }

    // Function to generate circle points
    function generateCircleWithTwoRadii(
      center,
      distance,
      bigDistance,
      startAngle,
      endAngle,
      numPoints = 360
    ) {
      const earthRadius = 6371000; // Earth's radius in meters
      const coordinates = [];
      const toRadians = (degrees) => (degrees * Math.PI) / 180;

      // Normalize angles to ensure they're within 0°–360°
      startAngle = startAngle % 360;
      endAngle = endAngle % 360;

      // Generate points for the full circle
      for (let i = 0; i < numPoints; i++) {
        const angleDegrees = (360 / numPoints) * i;
        const angle = toRadians(angleDegrees);

        // Check if the angle is within the bigDistance range, accounting for wrapping
        const inBigDistanceRange =
          startAngle <= endAngle
            ? angleDegrees >= startAngle && angleDegrees <= endAngle // Normal case
            : angleDegrees >= startAngle || angleDegrees <= endAngle; // Wrapping case

        // Use bigDistance for the active range, distance otherwise
        const currentRadius = inBigDistanceRange ? bigDistance : distance;

        const latitude =
          center.latitude +
          (currentRadius / earthRadius) * Math.cos(angle) * (180 / Math.PI);
        const longitude =
          center.longitude +
          ((currentRadius / earthRadius) * Math.sin(angle) * (180 / Math.PI)) /
            Math.cos(center.latitude * (Math.PI / 180));

        coordinates.push(new mapkit.Coordinate(latitude, longitude));
      }

      // Close the circle
      coordinates.push(coordinates[0]);

      return coordinates;
    }

    const numPoints = calculateNumPoints(bigDistance);
    const coordinates = generateCircleWithTwoRadii(
      new mapkit.Coordinate(lat, lon),
      distance,
      bigDistance,
      startAngle,
      endAngle,
      numPoints
    );
    const overlay = new mapkit.PolygonOverlay(coordinates);
    overlay.style = new mapkit.Style({
      lineWidth: 2,
      strokeColor: StatusColor.active,
      fillColor: StatusColor.active,
      fillOpacity: 0.3,
    });

    return overlay;
  }

  async updateTrack(alarm) {
    this.lastUpdate = Date.now();
    // Fetch vessel locations for this alarm
    const coordinates = await fetchVesselLocations(alarm.recordName).then(
      (locations) =>
        locations.map(
          (loc) =>
            new mapkit.Coordinate(
              loc.fields.CD_latitude.value,
              loc.fields.CD_longitude.value
            )
        )
    );

    // If we already have track overlay, we want to remove it first
    if (this.trackOverlay) {
      this.map.removeOverlay(this.trackOverlay);
    }

    if (this.shipOverlay) {
      this.map.removeOverlay(this.shipOverlay);
    }

    // Create and add the polyline overlay
    const trackOverlay = new mapkit.PolylineOverlay(coordinates);
    trackOverlay.style = new mapkit.Style({
      strokeColor: StatusColor.draft,
      lineWidth: 5,
      lineCap: "square",
    });
    this.trackOverlay = trackOverlay;
    this.map.addOverlay(this.trackOverlay);

    const shipOverlay = this.createShipOverlay(coordinates.at(0));
    this.shipOverlay = shipOverlay;
    this.map.addOverlay(shipOverlay);
  }
}

customElements.define("map-view", MapView);
