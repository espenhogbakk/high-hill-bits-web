import { fetchVesselLocations } from "../queries/index.js";
import { StatusColor } from "../lib/index.js";
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

    const alarm = this._alarm;
    const radius = alarm.fields.CD_distance.value;
    this.map = new mapkit.Map("map", {
      center: new mapkit.Coordinate(37.7749, -122.4194),
      cameraDistance: radius * 2.5,
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
    // We can modify this style after it's added as an overlay
    // and mapkit should re-render it...
    circle.style = new mapkit.Style({
      lineWidth: 2,
      strokeColor: StatusColor.active,
      fillColor: StatusColor.active,
      fillOpacity: 0.3,
    });
    this.map.addOverlay(circle);

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
      strokeColor: StatusColor.draft,
      lineWidth: 5,
      lineCap: "square",
    });
    this.map.addOverlay(polyline);
  }
}

customElements.define("map-view", MapView);
