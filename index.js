const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { google } = require("googleapis");
const serviceAccount = require("./service-account.json");

admin.initializeApp();

// Initialize the Google Sheets API
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const spreadsheetId = "your-sheet-id-here";

/**
 * Function to get the Google Sheets API client
 *
 * @returns {Promise<google.sheets_v4.Sheets>} A promise that resolves to the Google Sheets API client
 */
async function getSheetsClient() {
  const authClient = await auth.getClient();
  google.options({ auth: authClient });
  return google.sheets({ version: "v4", auth: authClient }).spreadsheets.values;
}

/**
 * Function to convert Firestore Timestamps to ISO strings
 *
 * @param {object} data The data to be processed
 * @return {object} The processed data with ISO strings
 */
function convertTimestamps(data) {
  const newData = {};
  for (const key in data) {
    if (data[key] && data[key]._seconds !== undefined) {
      newData[key] = new Date(data[key]._seconds * 1000 + data[key]._nanoseconds / 1000000).toISOString();
    } else {
      newData[key] = data[key];
    }
  }
  return newData;
}

/**
 * Function to add a new row to the Google Sheet
 *
 * @param {string} customerId The customer ID
 * @param {object} data The data to add to the new row
 * @return {Promise<void>} A promise that resolves when the row is added
 */
async function addRow(customerId, data) {
  const sheetsClient = await getSheetsClient();
  const processedData = convertTimestamps(data);
  const values = [[customerId, ...Object.values(processedData)]];
  const resource = {
    values,
  };
  await sheetsClient.append({
    spreadsheetId,
    range: "sheet1!A2:A", // Replace with your desired sheet name and range
    valueInputOption: "RAW",
    resource,
  });
}

/**
 * Function to update a row in the Google Sheet
 *
 * @param {string} customerId The customer ID
 * @param {object} data The data to add to the new row
 * @return {Promise<void>} A promise that resolves when the row is added
 */
async function updateRow(customerId, data) {
  const sheetsClient = await getSheetsClient();
  const sheetData = await sheetsClient.get({
    spreadsheetId,
    range: "sheet1!A:J",
  });

  const rows = sheetData.data.values || [];
  let rowIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === customerId) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    // Customer ID not found, add a new row
    await addRow(customerId, data);
  } else {
    // Customer ID found, update the existing row
    const processedData = convertTimestamps(data);
    const values = [customerId, ...Object.values(processedData)];
    const resource = {
      values: [values],
    };
    const range = `sheet1!A${rowIndex}:O${rowIndex}`; // Adjust to your suitable column range
    await sheetsClient.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      resource,
    });
  }
}

/**
 * Function to delete a row in the Google Sheet
 *
 * @param {string} customerId The customer ID
 * @return {Promise<void>} A promise that resolves when the row is deleted
 */
async function deleteRow(customerId) {
  const sheetsClient = await getSheetsClient();
  const sheetData = await sheetsClient.get({
    spreadsheetId,
    range: "sheet1!A:J",
  });

  const rows = sheetData.data.values || [];
  let rowIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === customerId) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex !== -1) {
    // Row found, delete it
    await google.sheets({ version: "v4", auth: await auth.getClient() }).spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0, // Adjust if your sheet ID is different
                dimension: "ROWS",
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    });
  }
}

exports.updateGoogleSheet = functions.database
  .ref("/customers/{customerId}")
  .onWrite(async (change, context) => {
    const customerId = context.params.customerId;
    const afterData = change.after.exists() ? change.after.val() : null;
    const beforeData = change.before.exists() ? change.before.val() : null;

    try {
      if (afterData) {
        await updateRow(customerId, afterData);
      } else if (!afterData && beforeData) {
        await deleteRow(customerId);
      }
    } catch (error) {
      console.error("Error updating Google Sheet:", error.message);
    }
  });
