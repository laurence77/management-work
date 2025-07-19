const express = require('express');
const Celebrity = require('../models/Celebrity');
const { UploadService, upload } = require('../services/uploadService');
const router = express.Router();

// GET /api/celebrities
router.get('/', async (req, res) => {
  try {
    const { search, category, availability, minPrice, maxPrice, sortBy, sortOrder } = req.query;
    
    if (search || category || availability !== undefined || minPrice || maxPrice) {
      const filters = {
        category,
        availability: availability === 'true' ? true : availability === 'false' ? false : undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        sortBy,
        sortOrder
      };
      
      const celebrities = await Celebrity.search(search, filters);
      res.json({ success: true, data: celebrities });
    } else {
      const celebrities = await Celebrity.getAll();
      res.json({ success: true, data: celebrities });
    }
  } catch (error) {
    console.error('Error fetching celebrities:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch celebrities' });
  }
});

// GET /api/celebrities/categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Celebrity.getCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// GET /api/celebrities/:id
router.get('/:id', async (req, res) => {
  try {
    const celebrity = await Celebrity.getById(req.params.id);
    if (!celebrity) {
      return res.status(404).json({ success: false, message: 'Celebrity not found' });
    }
    res.json({ success: true, data: celebrity });
  } catch (error) {
    console.error('Error fetching celebrity:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch celebrity' });
  }
});

// POST /api/celebrities (Admin only)
router.post('/', async (req, res) => {
  try {
    const { name, category, price, image, description, availability, rating } = req.body;
    
    if (!name || !category || !price) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, category, and price are required' 
      });
    }

    const celebrityData = {
      name,
      category,
      price: parseFloat(price),
      image,
      description,
      availability: availability !== false,
      rating: rating ? parseFloat(rating) : 0
    };

    const celebrity = await Celebrity.create(celebrityData);
    res.status(201).json({ success: true, data: celebrity });
  } catch (error) {
    console.error('Error creating celebrity:', error);
    res.status(500).json({ success: false, message: 'Failed to create celebrity' });
  }
});

// PUT /api/celebrities/:id (Admin only)
router.put('/:id', async (req, res) => {
  try {
    const celebrity = await Celebrity.update(req.params.id, req.body);
    if (!celebrity) {
      return res.status(404).json({ success: false, message: 'Celebrity not found' });
    }
    res.json({ success: true, data: celebrity });
  } catch (error) {
    console.error('Error updating celebrity:', error);
    res.status(500).json({ success: false, message: 'Failed to update celebrity' });
  }
});

// DELETE /api/celebrities/:id (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    const celebrity = await Celebrity.delete(req.params.id);
    if (!celebrity) {
      return res.status(404).json({ success: false, message: 'Celebrity not found' });
    }
    res.json({ success: true, message: 'Celebrity deleted successfully' });
  } catch (error) {
    console.error('Error deleting celebrity:', error);
    res.status(500).json({ success: false, message: 'Failed to delete celebrity' });
  }
});

// POST /api/celebrities/:id/upload-image (Admin only)
router.post('/:id/upload-image', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    // Validate file
    const validation = UploadService.validateImageFile(req.file);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.errors.join(', ') });
    }

    // Check if celebrity exists
    const celebrity = await Celebrity.getById(id);
    if (!celebrity) {
      return res.status(404).json({ success: false, message: 'Celebrity not found' });
    }

    // Upload image
    const uploadResult = await UploadService.uploadImage(req.file, 'celebrities');
    
    // Update celebrity with new image URL
    const updatedCelebrity = await Celebrity.update(id, { image: uploadResult.url });

    // Delete old image if exists (optional)
    // This would require storing the old image path
    
    res.json({ 
      success: true, 
      data: updatedCelebrity,
      upload: uploadResult
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
});

module.exports = router;