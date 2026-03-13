const express = require('express');
const router = express.Router();

router.get('/manifest.json', (req, res) => {
  const appName = process.env.VITE_APP_NAME || 'Notices';

  const manifest = {
    name: appName,
    short_name: appName.length > 6 ? appName.substring(0, 6) : appName,
    description: "Real-time push notification system",
    start_url: "/",
    display: "standalone",
    background_color: "#1a1a2e",
    theme_color: "#1a1a2e",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable"
      }
    ]
  };

  res.json(manifest);
});

module.exports = router;
