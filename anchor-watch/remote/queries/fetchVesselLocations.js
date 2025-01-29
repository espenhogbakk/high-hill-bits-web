import { database } from "../app.js";

export async function fetchVesselLocations(anchorLocationId) {
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
        fieldValue: { value: anchorLocationId },
      },
    ],
    sortBy: [{ fieldName: "CD_timestamp", ascending: false }],
  };

  const options = {
    desiredKeys,
    zoneID: { zoneName: "com.apple.coredata.cloudkit.zone" },
  };

  const response = await database.performQuery(query, options);
  return response.records || [];
}
