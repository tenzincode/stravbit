import axios, { AxiosResponse, AxiosError } from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Define interfaces for API responses
interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
}

interface FitbitTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  start_date: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  total_elevation_gain: number;
  sport_type: string;
  description?: string;
  [key: string]: any; // For other properties
}

interface FitbitActivityPayload {
  activityName: string;
  startTime: string;
  durationMillis: number;
  distance?: number;
  distanceUnit?: string;
  description?: string;
}

interface FitbitActivityResponse {
  activityLog: {
    logId: number;
    activityName: string;
    activityTypeId: number;
    [key: string]: any;
  };
  [key: string]: any;
}

interface EventData {
  client_payload?: {
    object_id?: string;
    owner_id?: string;
    event_time?: number;
    updates?: any;
  };
}

// Strava and Fitbit credentials
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const STRAVA_REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;
const FITBIT_CLIENT_ID = process.env.FITBIT_CLIENT_ID;
const FITBIT_CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET;
const FITBIT_REFRESH_TOKEN = process.env.FITBIT_REFRESH_TOKEN;

// Get event data from GitHub Actions
let eventData: EventData = {};
try {
  // GitHub Actions sets the event payload in GITHUB_EVENT_PATH
  if (process.env.GITHUB_EVENT_PATH) {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    const eventJson = fs.readFileSync(eventPath, 'utf8');
    eventData = JSON.parse(eventJson);
    console.log('Event data loaded from:', eventPath);
  } else {
    // For local testing
    eventData = {
      client_payload: {
        object_id: process.env.TEST_ACTIVITY_ID
      }
    };
    console.log('Using test activity ID from environment');
  }
} catch (error) {
  console.error('Error loading event data:', error);
  process.exit(1);
}

const activityId = eventData.client_payload?.object_id;
if (!activityId) {
  console.error('No activity ID found in event payload');
  process.exit(1);
}

const stravaActivityId: string = activityId;

console.log(`Processing Strava activity ID: ${stravaActivityId}`);

// Get fresh Strava access token
async function getStravaToken(): Promise<string> {
  try {
    if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
      throw new Error('Missing Strava credentials');
    }

    const response: AxiosResponse<StravaTokenResponse> = await axios.post(
      'https://www.strava.com/oauth/token',
      {
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        refresh_token: STRAVA_REFRESH_TOKEN,
        grant_type: 'refresh_token'
      }
    );

    return response.data.access_token;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Error refreshing Strava token:',
      axiosError.response?.data || axiosError.message);
    throw new Error('Failed to get Strava access token');
  }
}

// Get fresh Fitbit access token
async function getFitbitToken(): Promise<string> {
  try {
    if (!FITBIT_CLIENT_ID || !FITBIT_CLIENT_SECRET || !FITBIT_REFRESH_TOKEN) {
      throw new Error('Missing Fitbit credentials');
    }

    const authHeader = Buffer.from(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString('base64');

    const response: AxiosResponse<FitbitTokenResponse> = await axios.post(
      'https://api.fitbit.com/oauth2/token',
      `grant_type=refresh_token&refresh_token=${FITBIT_REFRESH_TOKEN}`,
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // Save the new refresh token for next time
    // In a production environment, you'd want to securely store this
    process.env.FITBIT_REFRESH_TOKEN = response.data.refresh_token;

    return response.data.access_token;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Error refreshing Fitbit token:',
      axiosError.response?.data || axiosError.message);
    throw new Error('Failed to get Fitbit access token');
  }
}

// Fetch Strava activity details
async function fetchActivity(id: string, token: string): Promise<StravaActivity> {
  try {
    console.log('Fetching activity details from Strava...');
    const response: AxiosResponse<StravaActivity> = await axios.get(
      `https://www.strava.com/api/v3/activities/${id}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    console.log(`Retrieved activity: ${response.data.name} (${response.data.type})`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Error fetching activity from Strava:',
      axiosError.response?.data || axiosError.message);
    throw new Error('Failed to fetch activity details from Strava');
  }
}

// Map Strava activity type to Fitbit activity type
function mapActivityType(stravaType: string): string {
  const typeMap: Record<string, string> = {
    'Run': 'Run',
    'Ride': 'Bike',
    'Swim': 'Swim',
    'Walk': 'Walk',
    'Hike': 'Hike',
    'WeightTraining': 'Weights',
    'Workout': 'Sport',
    'Yoga': 'Yoga'
  };

  return typeMap[stravaType] || 'Sport'; // Default to 'Sport' if no match
}

// Upload activity to Fitbit
async function uploadToFitbit(activity: StravaActivity, token: string): Promise<FitbitActivityResponse> {
  try {
    console.log('Preparing activity data for Fitbit...');

    // Format the activity data for Fitbit
    const fitbitActivityType = mapActivityType(activity.type);

    const payload: FitbitActivityPayload = {
      activityName: fitbitActivityType,
      startTime: activity.start_date,
      durationMillis: activity.elapsed_time * 1000,
      distance: activity.distance / 1000, // Fitbit expects km
      distanceUnit: 'Kilometer',
      description: `Imported from Strava: ${activity.name}`
    };

    console.log(`Uploading to Fitbit as: ${fitbitActivityType}`);

    const response: AxiosResponse<FitbitActivityResponse> = await axios.post(
      'https://api.fitbit.com/1/user/-/activities.json',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Successfully uploaded to Fitbit!');
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Error uploading to Fitbit:',
      axiosError.response?.data || axiosError.message);
    throw new Error('Failed to upload activity to Fitbit');
  }
}

// Main sync function
async function sync(): Promise<void> {
  try {
    console.log('Starting Strava to Fitbit sync...');

    // Get fresh tokens
    const stravaToken = await getStravaToken();
    const fitbitToken = await getFitbitToken();

    // Fetch activity details from Strava
    const activity = await fetchActivity(stravaActivityId, stravaToken);

    // Upload to Fitbit
    await uploadToFitbit(activity, fitbitToken);

    console.log(`Successfully synced activity "${activity.name}" from Strava to Fitbit!`);
  } catch (error) {
    console.error('Sync failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the sync process
sync();
