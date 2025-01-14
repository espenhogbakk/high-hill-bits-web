"use strict";

// CloudKit Configuration
CloudKit.configure({
  containers: [
    {
      containerIdentifier: "iCloud.com.highhillbits.anchorwatchpro",
      apiTokenAuth: {
        apiToken:
          "473e94ebaef019390e4a96151a5b4edd026ea33a99771a94022d9374aa87ff2d", // production
        //"0aaf97285b55a01cc8ecc420c330f194e58f1b88b4edacdd532f22a391f3de46", // development
        persist: true,
      },
      environment: "production", // Use 'development' for testing or 'production' for live
    },
  ],
});

console.log("CloudKit");

const container = CloudKit.getDefaultContainer();
container.registerForNotifications();
const database = container.privateCloudDatabase;

// state/store
let activeAnchorLocation = undefined;
let anchorLocations = [];
let vesselLocations = [];
let pollingInterval;

// Elements
const authButton = document.getElementById("authButton");
const userInfo = document.getElementById("userInfo");
const dataDisplay = document.getElementById("dataDisplay");

const displayUserName = (name) => {
  userInfo.innerHTML = `<p>${name}</p>`;
};

const setAnchorLocations = (records) => {
  anchorLocations = records;
  console.log("records:", records);
  dataDisplay.innerHTML = "";

  const ul = document.createElement("ul");
  records.forEach((record) => {
    const li = document.createElement("li");
    const a = document.createElement("a");

    // Set the link text
    a.textContent = record.fields.CD_name.value;
    a.href = "#";

    // Add a click handler
    a.addEventListener("click", (e) => {
      e.preventDefault();
      handleAnchorLocationClick(record);
    });

    // Append the link to the list item
    li.appendChild(a);

    // Append the list item to the list
    ul.appendChild(li);
  });

  // Add the list to the dataDisplay container
  dataDisplay.appendChild(ul);
};

const createSubscription = async (anchorLocation) => {
  const anchorLocationId = anchorLocation.recordName;
  const subscription = {
    subscriptionType: "query",
    firesOn: ["create", "update", "delete"],
    query: {
      recordType: "CD_VesselLocation",
      filterBy: [
        {
          fieldName: "CD_anchorLocation",
          comparator: "EQUALS",
          fieldValue: { value: anchorLocationId },
        },
      ],
    },
    notificationInfo: {
      alertBody: "Vessel location updated",
      shouldSendContentAvailable: true,
    },
  };

  try {
    const response = await database.saveSubscriptions([subscription]);
    console.log("Subscription created:", response.subscriptions);

    container.addNotificationListener(async (notification) => {
      if (
        notification.queryNotificationReason ==
        "QUERY_NOTIFICATION_REASON_RECORD_CREATED"
      ) {
        console.log("new vessel location added");
        const updatedRecords = await fetchVesselLocations(anchorLocationId);
        setVesselLocations(updatedRecords);
        redrawOverlays(map, anchorLocation);
      }
      console.log("notification received:", notification);
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
  }

  /*
  const anchorLocationId = anchorLocation.recordName;
  pollingInterval = setInterval(async () => {
    const updatedRecords = await fetchVesselLocations(anchorLocationId);
    setVesselLocations(updatedRecords);
    redrawOverlays(map, anchorLocation);
  }, 5000); // Poll every 5 seconds
  */
};

// Example click handler
const handleAnchorLocationClick = (record) => {
  setActiveAnchorLocation(record);
};

const redrawOverlays = (map, record) => {
  console.log("redraw overlays");
  map.overlays = [];
  updateAlarmRegion(map, record);
  const coordinates = vesselLocations.map((location) => {
    return new mapkit.Coordinate(
      location.fields.CD_latitude.value,
      location.fields.CD_longitude.value
    );
  });
  updateLocationTrack(map, coordinates);
};

const setActiveAnchorLocation = async (record) => {
  if (!record) {
    activeAnchorLocation = undefined;
    setAnchorLocations([]);
    setVesselLocations([]);
    map.overlays = [];
    return;
  }

  const anchorLocationId = record.recordName;
  const vesselLocations = await fetchVesselLocations(anchorLocationId);
  setVesselLocations(vesselLocations);

  // createSubscription for vessel location updates
  createSubscription(record);
  redrawOverlays(map, record);
};

const updateLocationTrack = (map, coordinates) => {
  const polyline = new mapkit.PolylineOverlay(coordinates);
  polyline.style = new mapkit.Style({
    strokeColor: "#0000ff", // Blue color
    lineWidth: 3, // Thickness of the polyline
    lineDash: [6, 4], // Dashed line pattern: 6px dash, 4px gap
    lineJoin: "round", // Rounded corners
  });
  map.addOverlay(polyline);
};

const updateAlarmRegion = (map, record) => {
  // Refactor and put inside it's own function
  const latitude = record.fields.CD_latitude.value;
  const longitude = record.fields.CD_longitude.value;

  // Define the radius of the circle (in meters)
  const radius = record.fields.CD_distance.value;
  const coordinate = new mapkit.Coordinate(latitude, longitude);

  // Create the circle overlay
  const circle = new mapkit.CircleOverlay(coordinate, radius);

  // Optionally style the circle
  circle.style = new mapkit.Style({
    lineWidth: 2, // Border width
    strokeColor: "#ff0000", // Border color
    fillColor: "rgba(255, 0, 0, 0.8)", // Fill color with transparency
  });

  // Add the circle overlay to the map
  map.center = coordinate;
  map.cameraDistance = radius * 5;
  map.addOverlay(circle);
};

const setVesselLocations = (records) => {
  vesselLocations = records;
};

// Authenticate User
const initialize = async () => {
  function gotoAuthenticatedState(userIdentity) {
    var name = userIdentity.nameComponents;
    if (name) {
      displayUserName(name.givenName + " " + name.familyName);
    } else {
      displayUserName("User record name: " + userIdentity.userRecordName);
    }
    container.whenUserSignsOut().then(gotoUnauthenticatedState);

    // Load data
    fetchAlarms();
  }

  function gotoUnauthenticatedState(error) {
    setActiveAnchorLocation(undefined);

    if (error && error.ckErrorCode === "AUTH_PERSIST_ERROR") {
      showDialogForPersistError();
    }

    displayUserName("Unauthenticated User");
    container
      .whenUserSignsIn()
      .then(gotoAuthenticatedState)
      .catch(gotoUnauthenticatedState);
  }

  const userIdentity = await container.setUpAuth();
  console.log("userIdentity:", userIdentity);
  if (userIdentity) {
    gotoAuthenticatedState(userIdentity);
  } else {
    gotoUnauthenticatedState();
  }
};

const fetchVesselLocations = async (anchorLocation) => {
  const desiredKeys = [
    "CD_anchorLocation",
    "CD_latitude",
    "CD_longitude",
    "CD_timestamp",
  ];

  const query = {
    recordType: "CD_VesselLocation",
    filterBy: [
      {
        fieldName: "CD_anchorLocation",
        comparator: "EQUALS",
        fieldValue: { value: anchorLocation },
      },
    ],
    sortBy: [
      {
        fieldName: "CD_timestamp",
        ascending: true,
      },
    ],
  };

  var options = {
    // Restrict our returned fields to this array of keys.
    desiredKeys: desiredKeys,

    // Fetch 5 results at a time.
    //resultsLimit: 100,

    // CoreData uses it's own zone, so must specify that
    zoneID: { zoneName: "com.apple.coredata.cloudkit.zone" },
  };

  const response = await database.performQuery(query, options);
  return response.records;
};

// Fetch Data from the Private Database
const fetchAlarms = async () => {
  const desiredKeys = [
    "CD_name",
    "CD_latitude",
    "CD_longitude",
    "CD_distance",
    "CD_bigDistance",
    "CD_statusRaw",
    "CD_modeRaw",
    "CD_startAngle",
    "CD_endAngle",
    "CD_timestamp",
  ];

  const query = {
    recordType: "CD_AnchorLocation",
    filterBy: [
      {
        fieldName: "CD_statusRaw",
        comparator: "NOT_EQUALS",
        fieldValue: { value: "draft" },
      },
    ],
    sortBy: [
      {
        fieldName: "CD_timestamp",
        ascending: true,
      },
      {
        fieldName: "CD_status",
        ascending: true,
      },
    ],
  };

  var options = {
    // Restrict our returned fields to this array of keys.
    desiredKeys: desiredKeys,

    // Fetch 5 results at a time.
    //resultsLimit: 5,

    zoneID: { zoneName: "com.apple.coredata.cloudkit.zone" },
  };

  const response = await database.performQuery(query, options);

  if (response.records && response.records.length > 0) {
    const anchorLocations = response.records;
    setAnchorLocations(anchorLocations);

    // If we have an active one, set that
    const activeAlarm = anchorLocations.find((r) => {
      return r.fields.CD_statusRaw.value == "active";
    });
    if (activeAlarm) {
      setActiveAnchorLocation(activeAlarm);
    }
  } else {
    dataDisplay.innerHTML = "<p>No records found.</p>";
  }
};

// Init map
mapkit.init({
  authorizationCallback: function (done) {
    done(
      "eyJraWQiOiJZRjJMVzlYV1pUIiwidHlwIjoiSldUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiIyOVY5SjZDMlEyIiwiaWF0IjoxNzM2ODA1MDU4LCJleHAiOjE3Mzc0NDYzOTl9.B1wj829LhpYCjwFiC134NDKV7KJ_gD7Ee-xSG97SqTykEO0I43-XKbf1ybRMj2vXCEQfjyQpZuOr5u8DNePn6g"
    );
  },
});

const map = new mapkit.Map("map", {
  center: new mapkit.Coordinate(37.7749, -122.4194), // Default center (San Francisco)
});
map.cameraDistance = 1000; // distance in meters

// Attach event to the Authenticate button
initialize();
