import { fetchAlarms } from "../queries/index.js";

class AlarmList extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<h2>Alarm List</h2><div id="dataDisplay" style="margin-top: 20px"></div>`;
    window.addEventListener("user-authenticated", () => this.loadAlarms());
  }

  async loadAlarms() {
    const alarms = await fetchAlarms();
    const dataDisplay = this.querySelector("#dataDisplay");
    dataDisplay.innerHTML = alarms.length ? "" : "<p>No alarms found.</p>";

    const ul = document.createElement("ul");
    alarms.forEach((alarm) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.textContent = alarm.fields.CD_name.value;
      a.href = "#";
      a.addEventListener("click", (e) => {
        e.preventDefault();
        this.selectAlarm(alarm);
      });
      li.appendChild(a);
      ul.appendChild(li);
    });

    dataDisplay.appendChild(ul);
  }

  selectAlarm(alarm) {
    const event = new CustomEvent("alarm-selected", { detail: alarm });
    window.dispatchEvent(event);
  }
}

customElements.define("alarm-list", AlarmList);
