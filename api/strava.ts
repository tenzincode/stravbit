import { VercelRequest, VercelResponse } from '@vercel/node';

const verifyToken = process.env.STRAVA_VERIFY_TOKEN;
const githubToken = process.env.GITHUB_TOKEN;
const githubRepo = process.env.GITHUB_REPO || 'tenzincode/stravbit';

export default async (req: VercelRequest, res: VercelResponse) => {
  // Handle Strava webhook verification (GET request)
  if (req.method === 'GET') {
    const challenge = req.query['hub.challenge'];
    const token = req.query['hub.verify_token'];

    if (token === verifyToken) {
      console.log('Webhook verification successful');
      return res.status(200).json({ 'hub.challenge': challenge });
    } else {
      console.error('Invalid verification token');
      return res.status(403).json({ error: 'Invalid verification token' });
    }
  }

  // Handle webhook event (POST request)
  if (req.method === 'POST') {
    try {
      const data = req.body;
      console.log('Received webhook event:', JSON.stringify(data));

      // Only process activity events
      if (data.object_type === 'activity' && data.aspect_type === 'create') {
        // Trigger GitHub Action via repository_dispatch
        const githubResponse = await fetch(`https://api.github.com/repos/${githubRepo}/dispatches`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_type: 'strava_activity',
            client_payload: {
              object_id: data.object_id,
              owner_id: data.owner_id,
              event_time: data.event_time,
              updates: data.updates
            }
          }),
        });

        if (githubResponse.ok) {
          console.log('GitHub Action triggered successfully');
          return res.status(200).json({ status: 'success', message: 'GitHub Action triggered' });
        } else {
          const errorText = await githubResponse.text();
          console.error('Failed to trigger GitHub Action:', errorText);
          return res.status(500).json({ status: 'error', message: 'Failed to trigger GitHub Action' });
        }
      } else {
        console.log('Ignoring non-activity or non-create event');
        return res.status(200).json({ status: 'ignored', message: 'Event type not processed' });
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      return res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }

  // Handle unsupported methods
  return res.status(405).json({ error: 'Method not allowed' });
};
