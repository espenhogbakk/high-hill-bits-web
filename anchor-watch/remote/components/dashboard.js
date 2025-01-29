import { store, database, container } from "../app.js";

class Dashboard extends HTMLElement {
  constructor() {
    super();
    this.interval = null;
    this.containerElement = null;
    this.lastUpdateElement = null;
  }
  connectedCallback() {
    this.innerHTML = `
      <style>
        #dashboard {
            position: fixed;
            bottom: -6px;
            left: 0;
            width: 100%;
            background: white;
            padding: 10px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
        }

        #dashboard.hidden {
            display: none;
        }

        #dashboard p {
            font-size: 12px;
            display: flex;
            justify-content: start; /* Keeps the text aligned left */
            margin-bottom: 10px;
            font-family: "San Francisco (SF Pro)", -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 18pt;
        }

        #dashboard p .detail {
            text-transform: none;
        }

        #dashboard strong {
            text-transform: uppercase;
            font-weight: bold;
            opacity: 0.7;
        }

        #dashboard #last-update {
          margin-left: 5px;
        }

        #dashboard #apple-sign-out-button {
            align-self: center; /* Centers only the sign-out button */
            transform: scale(0.8);
        }

      </style>

      <div id="dashboard">
        <p><strong>Last update:</strong><br /><span class="detail" id="last-update"></span></p>
        <div id="apple-sign-out-button"></div>
      </div>
    `;

    this.containerElement = this.querySelector("#dashboard");
    this.lastUpdateElement = this.querySelector("#last-update");
    this.render();

    this.interval = setInterval(() => {
      this.render();
    }, 1000);

    /*
    //alarm-deactivated
    window.addEventListener("alarm-activated", () => {
      this.render();
    });
    window.addEventListener("track-updated", () => {
      this.render();
    });
    */
  }

  render() {
    if (!store.activeAlarm) {
      this.containerElement.classList.add("hidden");
    } else {
      this.containerElement.classList.remove("hidden");
    }
    // Update last update
    if (store.lastUpdate) {
      this.lastUpdateElement.innerHTML = `${this.timeSince(
        store.lastUpdate
      )} <br /> (${store?.lastUpdate?.toLocaleString()})`;
    }
  }

  timeSince(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
      return remainingSeconds > 0
        ? `${minutes} minute${
            minutes !== 1 ? "s" : ""
          } and ${remainingSeconds} second${
            remainingSeconds !== 1 ? "s" : ""
          } ago`
        : `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    }

    return `more than an hour ago`;
  }
}

customElements.define("dash-board", Dashboard);
