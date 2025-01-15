import { fetchVesselLocations } from "../queries/index.js";
import { MAPKIT_TOKEN } from "../config.js";

class MapView extends HTMLElement {
  constructor() {
    super();
    this.map = null;
  }

  connectedCallback() {
    this.innerHTML = `<h2>Alarm View</h2><div id="map" style="width: 100%; height: 500px"></div>`;
    this.initMap();

    window.addEventListener("alarm-selected", (event) => {
      this.updateMap(event.detail);
    });
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
  }

  async updateMap(alarm) {
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

    // Create and add the polyline overlay
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
