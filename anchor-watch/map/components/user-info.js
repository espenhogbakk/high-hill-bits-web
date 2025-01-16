class UserInfo extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <style>
        #authentication-buttons {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: auto;
          height: auto;
          max-width: 90%;
          box-sizing: border-box;

          display: block;
          background: rgba(255, 255, 255, 1);
          padding: 100px;
          border-radius: 5px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        #authentication-buttons #login-info {
          margin-bottom: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          line-height: 1.25em;
        }

        #authentication-buttons #login-info #logo {
          width: 200px;
          margin-bottom: 50px;
        }

        #authentication-buttons.authenticated {
          transform: translate(0, 0);
          padding: 10px;
          height: 40px;

          top: auto;
          bottom: 5px;
          left: 5px;
        }

        #authentication-buttons.authenticated #login-info {
          display: none;
        }

      </style>
      <div id="authentication-buttons">
        <div id="login-info">
          <img id="logo" src="/images/anchor-watch/icon.png" />
          <p>
            Please log in using your Apple ID to see your alarm.
          </p>
        </div>
        <div id="apple-sign-in-button"></div>
        <div id="apple-sign-out-button"></div>
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
