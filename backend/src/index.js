require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');

const authRoutes = require('./routes/auth.routes');
const filesRoutes = require('./routes/files.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// Enable CORS for all origins (LAN demo — any device on the WiFi)
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// API Routes
app.use('/api', authRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/user', filesRoutes);    // /api/user/me is on filesRoutes
app.use('/api/admin', adminRoutes);

// Serve built React frontend (run `npm run build` in ../frontend first)
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
const fs = require('fs');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA fallback — serve index.html for all non-API routes
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
  console.log('✅ Serving frontend from:', frontendDist);
} else {
  console.log('⚠️  Frontend not built yet. Run: cd ../frontend && npm run build');
  app.get('/', (req, res) => {
    res.send('<h2>Campus Mini-Cloud API is running.<br>Build the frontend to serve the full app.</h2>');
  });
}

// Get LAN IP for helpful startup message
function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return 'unknown';
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  const lanIp = getLanIp();
  console.log('');
  console.log('🚀 Campus Mini-Cloud Server started');
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   LAN:     http://${lanIp}:${PORT}   ← share this with other devices`);
  console.log('');
});

module.exports = app;
