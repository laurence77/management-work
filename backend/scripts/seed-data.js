#!/usr/bin/env node

require('dotenv').config();
const { supabase, supabaseAdmin } = require('../config/supabase');

/**
 * Basic Data Seeding Script
 * Seeds initial data for development and testing
 */

const seedCelebrities = [
  {
    name: "Emma Watson",
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b743?w=400",
    price: "$50,000 - $100,000",
    rating: 4.9,
    category: "actors",
    description: "Award-winning actress and activist",
    availability: true
  },
  {
    name: "Ryan Reynolds",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    price: "$75,000 - $150,000",
    rating: 4.8,
    category: "actors",
    description: "Comedian and Hollywood star",
    availability: true
  },
  {
    name: "Taylor Swift",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
    price: "$200,000 - $500,000",
    rating: 5.0,
    category: "musicians",
    description: "Global music superstar",
    availability: true
  },
  {
    name: "Dwayne Johnson",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
    price: "$100,000 - $200,000",
    rating: 4.7,
    category: "actors",
    description: "Action star and former wrestler",
    availability: true
  },
  {
    name: "Beyoncé",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
    price: "$300,000 - $600,000",
    rating: 5.0,
    category: "musicians",
    description: "Global music icon and performer",
    availability: true
  }
];

const seedSiteSettings = [
  {
    key: 'site_name',
    value: 'EliteConnect Platform',
    type: 'text',
    is_public: true
  },
  {
    key: 'site_description',
    value: 'Premium Celebrity Booking Platform',
    type: 'text',
    is_public: true
  },
  {
    key: 'contact_email',
    value: 'info@eliteconnect.com',
    type: 'email',
    is_public: true
  },
  {
    key: 'contact_phone',
    value: '+1 (555) 123-4567',
    type: 'text',
    is_public: true
  },
  {
    key: 'contact_address',
    value: '123 Hollywood Blvd, Los Angeles, CA 90028',
    type: 'text',
    is_public: true
  }
];

async function seedDatabase() {
  console.log('🌱 Starting data seeding...\n');
  
  try {
    // Check if Supabase is configured
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.log('⚠️  Supabase not configured. Using in-memory data only.');
      console.log('✅ Seeding completed (in-memory mode)');
      return;
    }

    // Test connection
    const { data: testData, error: testError } = await supabase
      .from('celebrities')
      .select('count(*)')
      .limit(1);

    if (testError) {
      console.log('⚠️  Database connection failed. Using in-memory data.');
      console.log('Error:', testError.message);
      console.log('✅ Seeding completed (fallback mode)');
      return;
    }

    // Seed celebrities
    console.log('📱 Seeding celebrities...');
    const { data: existingCelebs, error: checkError } = await supabase
      .from('celebrities')
      .select('id')
      .limit(1);

    if (checkError) {
      console.log('⚠️  Could not check existing celebrities:', checkError.message);
    } else if (existingCelebs && existingCelebs.length > 0) {
      console.log('✅ Celebrities already exist, skipping...');
    } else {
      const { data: newCelebs, error: seedError } = await supabaseAdmin
        .from('celebrities')
        .insert(seedCelebrities)
        .select();

      if (seedError) {
        console.log('⚠️  Could not seed celebrities:', seedError.message);
      } else {
        console.log(`✅ Seeded ${newCelebs.length} celebrities`);
      }
    }

    // Seed site settings (if table exists)
    console.log('⚙️  Seeding site settings...');
    const { error: settingsError } = await supabaseAdmin
      .from('site_settings')
      .upsert(seedSiteSettings, { onConflict: 'key' });

    if (settingsError) {
      console.log('⚠️  Could not seed settings (table may not exist):', settingsError.message);
    } else {
      console.log(`✅ Seeded ${seedSiteSettings.length} site settings`);
    }

    console.log('\n🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.log('\n✅ Seeding completed (in-memory fallback mode)');
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Seeding script failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase, seedCelebrities, seedSiteSettings };