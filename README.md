# StravBit

A simple automation tool that syncs Strava activities to Fitbit using Vercel serverless functions and GitHub Actions.

## Overview

StravBit automatically syncs your Strava activities to your Fitbit account whenever a new activity is created on Strava. It uses:

1. **Vercel Serverless Functions** to receive and verify Strava webhooks
2. **GitHub Actions** as the execution environment for the sync process
3. **Strava API** to fetch activity details
4. **Fitbit API** to upload the activity data

## How It Works

1. When a new activity is created on Strava, a webhook notification is sent to your Vercel serverless function
2. The Vercel function verifies the webhook and triggers a GitHub repository dispatch event
3. The GitHub Action workflow is triggered by this event
4. The sync script fetches the activity details from Strava API using OAuth refresh tokens
5. The activity data is then uploaded to Fitbit API using OAuth refresh tokens

## Setup

### Prerequisites

- A Strava account with API access (client ID, client secret, and refresh token)
- A Fitbit account with API access (client ID, client secret, and refresh token)
- A GitHub repository to host this code
- A Vercel account to deploy the serverless function

### Configuration

1. Fork this repository
2. Deploy to Vercel:
   ```
   npm run deploy
   ```
3. Set up the following environment variables in Vercel:
   - `STRAVA_VERIFY_TOKEN`: A secret token you create to verify Strava webhooks
   - `GITHUB_TOKEN`: A GitHub personal access token with repo scope
   - `GITHUB_REPO`: Your GitHub repository in the format `username/repo`

4. Set up the following secrets in your GitHub repository:
   - `STRAVA_CLIENT_ID`: Your Strava API client ID
   - `STRAVA_CLIENT_SECRET`: Your Strava API client secret
   - `STRAVA_REFRESH_TOKEN`: Your Strava API refresh token
   - `FITBIT_CLIENT_ID`: Your Fitbit API client ID
   - `FITBIT_CLIENT_SECRET`: Your Fitbit API client secret
   - `FITBIT_REFRESH_TOKEN`: Your Fitbit API refresh token

5. Configure a Strava webhook:
   - Callback URL: `https://your-vercel-app.vercel.app/api/strava`
   - Verify token: The same value as your `STRAVA_VERIFY_TOKEN`

## Development

### Dependencies

- Node.js 18+
- Vercel CLI
- axios
- dotenv

### Local Testing

To test locally:

1. Create a `.env` file with your API credentials:
   ```
   STRAVA_VERIFY_TOKEN=your_verify_token
   GITHUB_TOKEN=your_github_token
   GITHUB_REPO=your_username/your_repo
   
   # For local testing of sync.js
   TEST_ACTIVITY_ID=your_test_activity_id
   STRAVA_CLIENT_ID=your_strava_client_id
   STRAVA_CLIENT_SECRET=your_strava_client_secret
   STRAVA_REFRESH_TOKEN=your_strava_refresh_token
   FITBIT_CLIENT_ID=your_fitbit_client_id
   FITBIT_CLIENT_SECRET=your_fitbit_client_secret
   FITBIT_REFRESH_TOKEN=your_fitbit_refresh_token
   ```

2. Run the local development server:
   ```
   npm run dev
   ```

3. Test the webhook with curl:
   ```
   # Test verification
   curl "http://localhost:3000/api/strava?hub.mode=subscribe&hub.challenge=challenge123&hub.verify_token=your_verify_token"
   
   # Test webhook event
   curl -X POST http://localhost:3000/api/strava \
     -H "Content-Type: application/json" \
     -d '{"object_type":"activity","object_id":"12345678","aspect_type":"create","owner_id":"87654321"}'
   ```

## License

See the [LICENSE](LICENSE) file for details.
