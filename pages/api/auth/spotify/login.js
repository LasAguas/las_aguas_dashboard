// pages/api/auth/spotify/login.js

export default function handler(req, res) {
    const scopes = [
      "user-read-email",
      "user-read-private",
      "user-read-recently-played",
      "user-top-read",
      "playlist-read-private",
    ];
  
    const query = new URLSearchParams({
      client_id: process.env.SPOTIFY_CLIENT_ID,
      response_type: "code",
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      scope: scopes.join(" "),
    });
  
    res.redirect(`https://accounts.spotify.com/authorize?${query.toString()}`);
  }
  