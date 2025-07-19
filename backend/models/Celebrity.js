const { supabase, supabaseAdmin } = require('../config/supabase');

class Celebrity {
  // Get all celebrities
  static async getAll() {
    try {
      const { data, error } = await supabase
        .from('celebrities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching celebrities:', error);
      throw error;
    }
  }

  // Get celebrity by ID
  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('celebrities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching celebrity:', error);
      throw error;
    }
  }

  // Create new celebrity
  static async create(celebrityData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('celebrities')
        .insert([{
          name: celebrityData.name,
          category: celebrityData.category,
          price: celebrityData.price,
          image: celebrityData.image || null,
          description: celebrityData.description,
          availability: celebrityData.availability !== false,
          rating: celebrityData.rating || 0,
          bookings: celebrityData.bookings || 0,
          // Location fields
          location_city: celebrityData.location_city || null,
          location_country: celebrityData.location_country || null,
          // Social media and contact fields
          facebook_url: celebrityData.facebook_url || null,
          instagram_url: celebrityData.instagram_url || null,
          email: celebrityData.email || null,
          whatsapp: celebrityData.whatsapp || null,
          telegram_url: celebrityData.telegram_url || null,
          signal_url: celebrityData.signal_url || null,
          // Additional info
          bio: celebrityData.bio || null,
          is_featured: celebrityData.is_featured || false
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating celebrity:', error);
      throw error;
    }
  }

  // Update celebrity
  static async update(id, celebrityData) {
    try {
      const updateData = {
        updated_at: new Date().toISOString()
      };

      // Only update fields that are provided
      if (celebrityData.name !== undefined) updateData.name = celebrityData.name;
      if (celebrityData.category !== undefined) updateData.category = celebrityData.category;
      if (celebrityData.price !== undefined) updateData.price = celebrityData.price;
      if (celebrityData.image !== undefined) updateData.image = celebrityData.image;
      if (celebrityData.description !== undefined) updateData.description = celebrityData.description;
      if (celebrityData.availability !== undefined) updateData.availability = celebrityData.availability;
      if (celebrityData.rating !== undefined) updateData.rating = celebrityData.rating;
      if (celebrityData.bookings !== undefined) updateData.bookings = celebrityData.bookings;
      
      // Location fields
      if (celebrityData.location_city !== undefined) updateData.location_city = celebrityData.location_city;
      if (celebrityData.location_country !== undefined) updateData.location_country = celebrityData.location_country;
      
      // Social media and contact fields
      if (celebrityData.facebook_url !== undefined) updateData.facebook_url = celebrityData.facebook_url;
      if (celebrityData.instagram_url !== undefined) updateData.instagram_url = celebrityData.instagram_url;
      if (celebrityData.email !== undefined) updateData.email = celebrityData.email;
      if (celebrityData.whatsapp !== undefined) updateData.whatsapp = celebrityData.whatsapp;
      if (celebrityData.telegram_url !== undefined) updateData.telegram_url = celebrityData.telegram_url;
      if (celebrityData.signal_url !== undefined) updateData.signal_url = celebrityData.signal_url;
      
      // Additional info
      if (celebrityData.bio !== undefined) updateData.bio = celebrityData.bio;
      if (celebrityData.is_featured !== undefined) updateData.is_featured = celebrityData.is_featured;

      const { data, error } = await supabaseAdmin
        .from('celebrities')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating celebrity:', error);
      throw error;
    }
  }

  // Delete celebrity
  static async delete(id) {
    try {
      const { data, error } = await supabaseAdmin
        .from('celebrities')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deleting celebrity:', error);
      throw error;
    }
  }

  // Search celebrities
  static async search(query, filters = {}) {
    try {
      let queryBuilder = supabase
        .from('celebrities')
        .select('*');

      // Text search
      if (query) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
      }

      // Category filter
      if (filters.category) {
        queryBuilder = queryBuilder.eq('category', filters.category);
      }

      // Availability filter
      if (filters.availability !== undefined) {
        queryBuilder = queryBuilder.eq('availability', filters.availability);
      }

      // Price range filter
      if (filters.minPrice) {
        queryBuilder = queryBuilder.gte('price', filters.minPrice);
      }
      if (filters.maxPrice) {
        queryBuilder = queryBuilder.lte('price', filters.maxPrice);
      }

      // Sort
      const sortBy = filters.sortBy || 'created_at';
      const sortOrder = filters.sortOrder === 'asc' ? { ascending: true } : { ascending: false };
      queryBuilder = queryBuilder.order(sortBy, sortOrder);

      const { data, error } = await queryBuilder;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error searching celebrities:', error);
      throw error;
    }
  }

  // Get categories (distinct)
  static async getCategories() {
    try {
      const { data, error } = await supabase
        .from('celebrities')
        .select('category')
        .not('category', 'is', null);

      if (error) throw error;
      
      // Get unique categories
      const categories = [...new Set(data.map(item => item.category))];
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }
}

module.exports = Celebrity;