const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// API routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Ana sayfa route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server başlat
app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
    console.log(`Dashboard: http://localhost:${PORT}`);
});

