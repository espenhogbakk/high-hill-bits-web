import { fetchAlarms } from "../queries/index.js";

class MapContainer extends HTMLElement {
  constructor() {
    super();
    this.mapView = null;
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

    window.addEventListener("user-logged-in", () => this.loadAlarms());
    window.addEventListener("user-logged-out", () => this.removeMap());
    window.addEventListener("alarm-activated", (event) =>
      this.addMap(event.detail)
    );
  }

  addMap(alarm) {
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
  }

  // Responsible for loading alarms from CloudKit and if we find an active one
  // we want to add the map
  async loadAlarms() {
    const alarms = await fetchAlarms();

    // TODO - Add subscriber to watch for new active alarms

    if (!alarms.length) {
      // Show message about no active alarms
      this.infoElement.style.display = "block";
      return;
    }

    // Search for active alarms
    const activeAlarm = alarms.find((a) => {
      return a.fields.CD_statusRaw.value == "active";
    });

    if (!activeAlarm) {
      // Show message about no active alarms
      this.infoElement.style.display = "block";
      return;
    }

    this.selectAlarm(activeAlarm);
  }

  selectAlarm(alarm) {
    const event = new CustomEvent("alarm-activated", { detail: alarm });
    window.dispatchEvent(event);
  }
}

customElements.define("map-container", MapContainer);
