class RemoteWatchDisclaimer extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
      <style>
        /* Disclaimer Container */
        #disclaimer {
          background: white;
          padding: 20px;
          width: 100%;
          min-height: 100%;
          box-sizing: border-box;
          margin: 20px auto;
          color: #333;
          position: absolute;
          top: 0;
          left: 0;
          z-index: 10;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        #disclaimer .text {
          max-width: 600px;
        }

        /* Title */
        #disclaimer h2 {
          font-size: 1.5rem;
          font-weight: bold;
          color: #5856d6; /* A nice warning red */
          text-align: center;
          margin-bottom: 15px;
        }

        /* Paragraphs */
        #disclaimer p {
          font-size: 1rem;
          line-height: 1.5;
          color: #444;
        }

        /* Bullet Points */
        #disclaimer ul {
          margin-top: .5rem;
          padding-left: 20px;
          list-style-type: disc;
        }

        #disclaimer ul li {
          font-size: 1rem;
          line-height: 1.6;
          margin-bottom: 10px;
        }

        /* Highlighted Text */
        #disclaimer strong {
          color: #5856d6; /* Slightly emphasized warning color */
          font-weight: bold;
        }

        /* Footer Note */
        #disclaimer p:last-child {
          text-align: center;
          font-style: italic;
          font-size: 0.9rem;
          color: #666;
        }

        #acknowledge-button {
          display: block;
          width: 100%;
          padding: 10px;
          font-size: 1rem;
          font-weight: bold;
          color: white;
          background: #5856d6;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          margin-top: 10px;
          transition: background 0.3s ease-in-out;
        }

        #acknowledge-button:hover {
          background: #5856d6;
        }

        /* Hide Disclaimer When Not Needed */
        #disclaimer.hidden {
          display: none;
        }
      </style>

      <section id="disclaimer">
        <div class="text">
          <h2>Please read this carefully</h2>
          <p>
            <strong>Remote Watch</strong> is designed to help you keep an eye on
            your boat’s position from anywhere by syncing location data through
            Apple’s secure cloud infrastructure. However, please keep in mind:
          </p>
          <ul>
            <li>
              <strong>The data is not always live.</strong> Syncing can be delayed
              by several minutes or may stop altogether due to network issues, power
              loss, or other factors.
            </li>
            <li>
              <strong
                >Do not rely on Remote Watch as your only safety measure.</strong
              >
              It’s a helpful tool, but it should never replace proper onboard
              monitoring and responsible seamanship.
            </li>
            <li>
              <strong>High Hill Bits AS takes no responsibility</strong> for delays,
              interruptions, or inaccuracies in the Remote Watch function. It’s
              provided as-is, and you use it at your own risk.
            </li>
          </ul>
          <p>
            By enabling Remote Watch, you acknowledge and accept these limitations.
            Stay safe, and always use proper precautions when anchoring!
          </p>
          <button id="acknowledge-button">I Understand</button>
        </div>
      </section>
    `;

    this.init();
  }

  init() {
    const disclaimer = this.querySelector("#disclaimer");
    const button = this.querySelector("#acknowledge-button");

    // Function to set a cookie
    const setCookie = (name, value, days) => {
      let expires = "";
      if (days) {
        let date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
      }
      document.cookie = name + "=" + value + expires + "; path=/";
    };

    // Function to get a cookie value
    const getCookie = (name) => {
      let nameEQ = name + "=";
      let ca = document.cookie.split(";");
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(nameEQ) === 0) {
          return c.substring(nameEQ.length, c.length);
        }
      }
      return null;
    };

    // Check if user has already acknowledged the disclaimer
    const cookieName = "highhillbits.com.anchorwatch.disclaimer";

    if (getCookie(cookieName) === "true") {
      disclaimer.classList.add("hidden");
    }

    // Hide disclaimer and store acknowledgment when button is clicked
    button.addEventListener("click", () => {
      setCookie(cookieName, "true", 30); // Store for 30 days
      disclaimer.classList.add("hidden");
    });
  }
}

customElements.define("remote-watch-disclaimer", RemoteWatchDisclaimer);
