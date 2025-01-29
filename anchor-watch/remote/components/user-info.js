class UserInfo extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <style>
        #authentication-buttons {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          box-sizing: border-box;

          display: block;
          background: rgba(255, 255, 255, 1);
          padding: 20px 10px;
          border-radius: 5px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        #authentication-buttons #login-info {
          margin-bottom: 30px;
        }

        #apple-sign-in-button {
          text-align: start;
        }

        #authentication-buttons .disclaimer {
          margin-top: 50px;
          font-size: 12px;
          opacity: 0.7;
        }

        #authentication-buttons #login-info #logo {
          width: 200px;
          margin-bottom: 50px;
        }

        #authentication-buttons.authenticated {
          display: none;
        }
      </style>

      <div id="authentication-buttons">
        <div id="login-info">
          <img id="logo" src="/images/anchor-watch/icon.png" />
          <p>
            Sign in with the same Apple ID as on your Anchor Watch device to view your alarm.
          </p>
        </div>
        <div id="apple-sign-in-button"></div>

        <p class="disclaimer">
          Your data remains completely safe and private—it never leaves your Apple account. This service operates entirely using Apple’s official client-side libraries to connect directly to Apple CloudKit. There are no intermediary servers, ensuring that all communication happens strictly between your device and Apple’s secure infrastructure. No data is ever shared with third-party services, keeping your information fully protected within Apple’s ecosystem.
        </p>

      </div>
    `;

    this.authenticationButtons = this.querySelector("#authentication-buttons");
    window.addEventListener("user-logged-in", () => {
      this.authenticationButtons.classList.add("authenticated");
    });
    window.addEventListener("user-logged-out", () => {
      this.authenticationButtons.classList.remove("authenticated");
    });
  }
}

customElements.define("user-info", UserInfo);
