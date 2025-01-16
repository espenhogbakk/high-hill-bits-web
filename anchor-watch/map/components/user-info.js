class UserInfo extends HTMLElement {
  connectedCallback() {
    // Use innerHTML to inject content into the global DOM
    this.innerHTML = `
      <style>
        #authentication-buttons {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: auto;
          height: auto;

          display: block;
          background: rgba(255, 255, 255, 1);
          padding: 100px;
          border-radius: 5px;
        }

        #authentication-buttons.authenticated {
          transform: translate(0, 0);
          padding: 10px;
          height: 40px;

          top: auto;
          bottom: 5px;
          left: 5px;
        }

      </style>
      <div id="authentication-buttons">
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
