const Celebrity = require('../models/Celebrity');
const { UploadService } = require('../services/uploadService');

class CelebrityController {
  async getAllCelebrities(req, res, next) {
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
      next(error);
    }
  }

  async getCategories(req, res, next) {
    try {
      const categories = await Celebrity.getCategories();
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  async getCelebrityById(req, res, next) {
    try {
      const celebrity = await Celebrity.getById(req.params.id);
      if (!celebrity) {
        return res.status(404).json({ success: false, message: 'Celebrity not found' });
      }
      res.json({ success: true, data: celebrity });
    } catch (error) {
      next(error);
    }
  }

  async createCelebrity(req, res, next) {
    try {
      const { name, category, price, image, description, availability, rating } = req.body;
      
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
      next(error);
    }
  }

  async updateCelebrity(req, res, next) {
    try {
      const celebrity = await Celebrity.update(req.params.id, req.body);
      if (!celebrity) {
        return res.status(404).json({ success: false, message: 'Celebrity not found' });
      }
      res.json({ success: true, data: celebrity });
    } catch (error) {
      next(error);
    }
  }

  async deleteCelebrity(req, res, next) {
    try {
      const celebrity = await Celebrity.delete(req.params.id);
      if (!celebrity) {
        return res.status(404).json({ success: false, message: 'Celebrity not found' });
      }
      res.json({ success: true, message: 'Celebrity deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async uploadCelebrityImage(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file provided' });
      }

      const validation = UploadService.validateImageFile(req.file);
      if (!validation.isValid) {
        return res.status(400).json({ success: false, message: validation.errors.join(', ') });
      }

      const celebrity = await Celebrity.getById(id);
      if (!celebrity) {
        return res.status(404).json({ success: false, message: 'Celebrity not found' });
      }

      const uploadResult = await UploadService.uploadImage(req.file, 'celebrities');
      const updatedCelebrity = await Celebrity.update(id, { image: uploadResult.url });

      res.json({ 
        success: true, 
        data: updatedCelebrity,
        upload: uploadResult
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CelebrityController();