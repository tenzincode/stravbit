import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const STRAVA_TOKEN = process.env.STRAVA_TOKEN;
const FITBIT_TOKEN = process.env.FITBIT_TOKEN;

// Extract activity ID from webhook payload
const eventPayload = JSON.parse(process.env.GITHUB_EVENT_PATH);
const activityId = eventPayload.client_payload?.object_id;

// Fetch Strava activity details
async function fetchActivity(id) {
  const res = await axios.get(`https://www.strava.com/api/v3/activities/${id}`, {
    headers: { Authorization: `Bearer ${STRAVA_TOKEN}` },
  });
  return res.data;
}

// Upload to Fitbit
async function uploadToFitbit(activity) {
  const payload = {
    activityName: "Cycling",
    durationMillis: activity.moving_time * 1000,
    distance: activity.distance,
    startTime: activity.start_date,
  };

  await axios.post('https://api.fitbit.com/1/user/-/activities.json', payload, {
    headers: { Authorization: `Bearer ${FITBIT_TOKEN}`, 'Content-Type': 'application/json' },
  });
}

// Run Sync
async function sync() {
  if (!activityId) {
    console.error("No activity ID found in webhook payload.");
    return;
  }
  try {
    const activity = await fetchActivity(activityId);
    await uploadToFitbit(activity);
    console.log(`Synced activity: ${activity.name}`);
  } catch (error) {
    console.error("Sync failed:", error.response?.data || error.message);
  }
}

sync();
