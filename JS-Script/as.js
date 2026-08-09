// const myHeaders = new Headers();
// myHeaders.append("Content-Type", "application/json");

// const raw = JSON.stringify({
//   "userId": "rn0CThbJkUGxBsWhmXsfpqR2cup1MYFZXqfFfWbnRbxIHiYB3FhalemAVB29gGax",
//   "timestamp": Date.now()
// });

// const requestOptions = {
//   method: "POST", // Changed from GET to POST so the body is preserved
//   headers: myHeaders,
//   body: raw,
//   redirect: "follow"
// };

// // We return response.text() so it flows correctly to the next .then()
// fetch("https://prismhealth.novelvox.net/api/cognito", requestOptions)
//   .then((response) => response.text())
//   .then((result) => {
//     console.log("Success:", result);
//   })
//   .catch((error) => {
//     console.error("Error:", error);
//   });



const inputFilePath = "D:\\Aniket\\Code\\Scripts\\JS-Script\\AthenaLambdaAPI\\dash_success_responses.json"

const fs = require('fs');
if (!fs.existsSync(inputFilePath)) {
  console.error(`Error: File not found at ${inputFilePath}`);
  return;
}

let rawData = fs.readFileSync(inputFilePath, 'utf-8');

// Clean up formatting issues like the extra double commas ', ,' from raw JSON strings if any exist
rawData = rawData.replace(/,\s*,/g, ',');

let patientsList;
try {
  patientsList = JSON.parse(rawData);
} catch (parseErr) {
  console.error("Failed to parse JSON file. Ensure it is valid JSON.", parseErr.message);
  return;
}

// Filter for records where data.status is "SUCCESS"
const successPatients = patientsList.filter(item => item && item.data && item.data.status === 'SUCCESS');

for (let element of successPatients) {
  // const element = array[index];
  console.log(`Patient -> DOB: ${element.data.data.patient.dob} & Phone: ${element.data.data.patient.phoneNumber}`);
  
}