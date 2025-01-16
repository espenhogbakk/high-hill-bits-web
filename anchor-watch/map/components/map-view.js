import { fetchVesselLocations } from "../queries/index.js";
import { MAPKIT_TOKEN } from "../config.js";

class MapView extends HTMLElement {
  constructor() {
    super();
    this.map = null;
    this._alarm = null;
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

    this.map = new mapkit.Map("map", {
      center: new mapkit.Coordinate(37.7749, -122.4194),
      cameraDistance: 1000,
    });

    this.render();
  }

  async render() {
    // Draw the alarm zone on the map
    const alarm = this._alarm;
    const lat = alarm.fields.CD_latitude.value;
    const lon = alarm.fields.CD_longitude.value;
    const radius = alarm.fields.CD_distance.value;

    const alarmCoordinate = new mapkit.Coordinate(lat, lon);
    this.map.center = alarmCoordinate;

    // Clear existing overlays
    this.map.overlays = [];

    // Create and add the circle overlay
    const circle = new mapkit.CircleOverlay(
      new mapkit.Coordinate(lat, lon),
      radius
    );
    circle.style = new mapkit.Style({
      lineWidth: 2,
      strokeColor: "#ff0000",
      fillColor: "rgba(255, 0, 0, 0.3)",
    });
    this.map.addOverlay(circle);

    // Update the track
    this.updateTrack(alarm);
  }

  async updateTrack(alarm) {
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

    // Create and add the polyline overlay
    const polyline = new mapkit.PolylineOverlay(coordinates);
    polyline.style = new mapkit.Style({
      strokeColor: "#0000ff",
      lineWidth: 3,
      lineDash: [6, 4],
    });
    this.map.addOverlay(polyline);
  }
}

customElements.define("map-view", MapView);
