
# Google Sheets Sync with Firebase Realtime Database

This Cloud Function synchronizes data between Firebase Realtime Database and a Google Sheets spreadsheet. When an order is added, updated, or deleted in the Realtime Database, the corresponding row in the Google Sheets is added, updated, or deleted.

## Prerequisites

- Node.js
- Firebase CLI
- A Firebase project
- Google Cloud project with Google Sheets API enabled
- Service account JSON file with appropriate permissions

## Setup

1. **Clone the repository and install dependencies:**

    ```sh
    git clone <repository-url>
    cd <repository-directory>
    npm install
    ```

2. **Setup Firebase:**

    ```sh
    firebase login
    firebase init functions
    ```

3. **Enable Google Sheets API:**

    Go to the [Google Cloud Console](https://console.cloud.google.com/), select your project, and enable the Google Sheets API.

4. **Create a service account:**

    - Go to the [Service Accounts page](https://console.cloud.google.com/iam-admin/serviceaccounts) in the Cloud Console.
    - Click `Create Service Account`.
    - Fill in the details and assign the `Editor` role.
    - Create a key in JSON format and download it.

5. **Place the service account JSON file:**

    Place the downloaded `service-account.json` file in the root of your functions directory.

6. **Update the `spreadsheetId`:**

    Replace the `spreadsheetId` variable in the code with your Google Sheets spreadsheet ID. To find your spreadsheet ID, open your Google Sheets file and look at the URL. The ID is the long string between `/d/` and `/edit`.

    Example URL:
    ```
    https://docs.google.com/spreadsheets/d/1aih6l9FOr6ik/edit
    ```

    Spreadsheet ID:
    ```
    1aih6l9FOr6ik
    ```
7. **Invite the Service Account**

   If you created a new service account invite the service account email to the Google Sheet and disable notifications. You can find the service account email in the `service-account.json` file on line "client_email"(service-account@projid.iam.gserviceaccount.com)

## Deploy the Cloud Function

Deploy the Cloud Function to Firebase:

```sh
firebase deploy --only functions
```

## How It Works

- **Initialization:**
  - The `admin` module initializes the Firebase Admin SDK.
  - The `google` module initializes the Google Sheets API with the provided service account credentials.

- **Functions:**
  - `getSheetsClient()`: Authenticates and returns a Google Sheets API client.
  - `convertTimestamps(data)`: Converts Firestore timestamps to ISO strings.
  - `addRow(customerId, data)`: Adds a new row to the Google Sheets.
  - `updateRow(customerId, data)`: Updates an existing row in the Google Sheets.
  - `deleteRow(customerId)`: Deletes a row in the Google Sheets.

- **Trigger:**
  - The Cloud Function `updateGoogleSheet` triggers on any write operation to the `/customers/{customerId}` path in the Realtime Database. It handles adding, updating, and deleting rows in the Google Sheets based on the changes in the Realtime Database.

## Example Use

Add, update, or delete documents in the `/customers` path of your Firebase Realtime Database, and the changes will be reflected in the Google Sheets.

## Error Handling

If there is an error while updating the Google Sheets, it will be logged to the console.

```javascript
try {
  if (afterData) {
    await updateRow(orderId, afterData);
  } else if (!afterData && beforeData) {
    await deleteRow(orderId);
  }
} catch (error) {
  console.error("Error updating Google Sheet:", error.message);
}
```

## License

This project is licensed under the MIT License. See the LICENSE file for details.

