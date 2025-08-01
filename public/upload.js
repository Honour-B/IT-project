// routes/upload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('public/cloudinary'); // adjust path
const upload = multer({ storage });

const pool = require('pg'); // your PostgreSQL pool

// Example route for uploading a file
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    const imageUrl = req.file.path;

    // Save the URL to DB
    const result = await pool.query(
      'INSERT INTO uploads (image_url) VALUES ($1) RETURNING *',
      [imageUrl]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

module.exports = router;
