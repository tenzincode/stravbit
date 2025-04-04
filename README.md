# StravBit

A simple automation tool that syncs Strava activities to Fitbit using GitHub Actions.

## Overview

StravBit automatically syncs your Strava activities to your Fitbit account whenever a new activity is created on Strava. It uses GitHub Actions as the execution environment and is triggered by Strava webhooks.

## How It Works

1. When a new activity is created on Strava, a webhook sends a repository dispatch event to GitHub
2. The GitHub Action workflow is triggered by this event
3. The sync script fetches the activity details from Strava API
4. The activity data is then uploaded to Fitbit API

## Setup

### Prerequisites

- A Strava account with API access
- A Fitbit account with API access
- A GitHub repository to host this code

### Configuration

1. Fork this repository
2. Set up the following secrets in your GitHub repository:
   - `STRAVA_TOKEN`: Your Strava API access token
   - `FITBIT_TOKEN`: Your Fitbit API access token
3. Configure a Strava webhook to send repository dispatch events to your GitHub repository

## Development

### Dependencies

- Node.js 18+
- axios
- dotenv

### Local Testing

To test locally:

1. Create a `.env` file with your API tokens:
   ```
   STRAVA_TOKEN=your_strava_token
   FITBIT_TOKEN=your_fitbit_token
   ```
2. Run the sync script:
   ```
   node sync.js
   ```

## License

See the [LICENSE](LICENSE) file for details.
