import { database } from "../app.js";

export async function fetchAlarms() {
  const desiredKeys = [
    "CD_name",
    "CD_latitude",
    "CD_longitude",
    "CD_distance",
    "CD_bigDistance",
    "CD_startAngle",
    "CD_endAngle",
    "CD_modeRaw",
    "CD_statusRaw",
    "CD_timestamp",
  ];

  const query = {
    recordType: "CD_AnchorLocation",
    filterBy: [
      {
        fieldName: "CD_statusRaw",
        comparator: "EQUALS",
        fieldValue: { value: "active" },
      },
    ],
    sortBy: [{ fieldName: "CD_timestamp", ascending: true }],
  };

  const options = {
    desiredKeys,
    zoneID: { zoneName: "com.apple.coredata.cloudkit.zone" },
  };

  const response = await database.performQuery(query, options);
  return response.records || [];
}
