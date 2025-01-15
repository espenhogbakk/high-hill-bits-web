class UserInfo extends HTMLElement {
  connectedCallback() {
    // Use innerHTML to inject content into the global DOM
    this.innerHTML = `
      <style>
        #user-info {
          margin: 20px;
        }
      </style>
      <div id="user-info">
        <p id="user-name">Unauthenticated User</p>
        <div id="apple-sign-in-button"></div>
        <div id="apple-sign-out-button"></div>
      </div>
    `;

    this.userNameElement = this.querySelector("#user-name");

    // Initialize CloudKit authentication state
    this.initializeAuthState();
  }

  initializeAuthState() {
    const container = CloudKit.getDefaultContainer();

    // Handle user signing in
    container.whenUserSignsIn().then((userIdentity) => {
      const name = userIdentity.userRecordName;
      this.updateUI(true, name);
      this.dispatchEvent(
        new CustomEvent("user-authenticated", { bubbles: true })
      );
    });

    // Handle user signing out
    container.whenUserSignsOut().then(() => {
      this.updateUI(false);
    });

    // Initial auth state
    container.setUpAuth().then((userIdentity) => {
      if (!userIdentity) {
        this.updateUI(false);
      }
    });
  }

  updateUI(isAuthenticated, userName = "Unauthenticated User") {
    this.userNameElement.textContent = userName;
  }
}

customElements.define("user-info", UserInfo);
