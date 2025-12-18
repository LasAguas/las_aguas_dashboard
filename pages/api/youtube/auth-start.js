// pages/api/youtube/auth-start.js
export default async function handler(req, res) {
    try {
      const artistId = req.query.artistId;
      if (!artistId) {
        res.status(400).send("Missing artistId");
        return;
      }
  
      const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
      const redirectUri = process.env.YOUTUBE_OAUTH_REDIRECT_URI;
  
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        access_type: "offline", // get refresh token
        prompt: "consent", // force refresh_token on first connect
        scope: [
          "https://www.googleapis.com/auth/youtube.readonly",
          "https://www.googleapis.com/auth/yt-analytics.readonly",
        ].join(" "),
        state: String(artistId),
        include_granted_scopes: "true",
      });
  
      const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      res.redirect(url);
    } catch (err) {
      console.error("YouTube auth-start error", err);
      res.status(500).send("YouTube auth-start error");
    }
  }
  