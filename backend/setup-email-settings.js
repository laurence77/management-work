require('dotenv').config();
const { supabase } = require('./config/supabase');

async function setupEmailSettings() {
  console.log('🔧 Setting up email configuration in database...');

  const emailSettings = [
    { setting_key: 'smtp_host', setting_value: 'smtp.hostinger.com', description: 'SMTP Server Host' },
    { setting_key: 'smtp_port', setting_value: '465', description: 'SMTP Server Port' },
    { setting_key: 'smtp_secure', setting_value: 'true', description: 'Use SSL/TLS' },
    { setting_key: 'smtp_user', setting_value: 'management@bookmyreservation.org', description: 'SMTP Username' },
    { setting_key: 'smtp_pass', setting_value: 'process.env.ADMIN_PASSWORD || 'changeme123'', description: 'SMTP Password' },
    { setting_key: 'email_from', setting_value: 'Celebrity Booking Platform <management@bookmyreservation.org>', description: 'From Email Address' },
    { setting_key: 'primary_email', setting_value: 'management@bookmyreservation.org', description: 'Primary Contact Email' },
    { setting_key: 'support_email', setting_value: 'support@bookmyreservation.org', description: 'Support Email Address' },
    { setting_key: 'noreply_email', setting_value: 'noreply@bookmyreservation.org', description: 'No-Reply Email Address' }
  ];

  try {
    console.log('📊 Checking if email_settings table exists...');
    
    // Check if the table exists and create if needed
    const { data: tables, error: tableError } = await supabase
      .from('email_settings')
      .select('*')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      console.log('📝 Creating email_settings table...');
      
      // Create the table
      const { error: createError } = await supabase.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS email_settings (
            id SERIAL PRIMARY KEY,
            setting_key VARCHAR(100) UNIQUE NOT NULL,
            setting_value TEXT NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE OR REPLACE FUNCTION get_email_setting(p_setting_key TEXT)
          RETURNS TEXT AS $$
          BEGIN
            RETURN (SELECT setting_value FROM email_settings WHERE setting_key = p_setting_key AND is_active = true);
          END;
          $$ LANGUAGE plpgsql;
          
          CREATE OR REPLACE FUNCTION update_email_setting(p_setting_key TEXT, p_setting_value TEXT)
          RETURNS BOOLEAN AS $$
          BEGIN
            INSERT INTO email_settings (setting_key, setting_value, updated_at)
            VALUES (p_setting_key, p_setting_value, NOW())
            ON CONFLICT (setting_key) 
            DO UPDATE SET setting_value = p_setting_value, updated_at = NOW();
            RETURN true;
          END;
          $$ LANGUAGE plpgsql;
        `
      });

      if (createError) {
        console.log('❌ Failed to create table:', createError.message);
        console.log('ℹ️ Trying direct insert instead...');
      }
    }

    console.log('📤 Inserting email settings...');
    
    // Insert/update each setting
    for (const setting of emailSettings) {
      try {
        const { data, error } = await supabase
          .from('email_settings')
          .upsert({
            setting_key: setting.setting_key,
            setting_value: setting.setting_value,
            description: setting.description,
            is_active: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'setting_key'
          });

        if (error) {
          console.log(`⚠️  Failed to insert ${setting.setting_key}:`, error.message);
        } else {
          console.log(`✅ Set ${setting.setting_key}: ${setting.setting_value}`);
        }
      } catch (settingError) {
        console.log(`❌ Error with ${setting.setting_key}:`, settingError.message);
      }
    }

    console.log('🧪 Testing email settings retrieval...');
    
    // Test retrieval
    const { data: allSettings, error: retrieveError } = await supabase
      .from('email_settings')
      .select('*')
      .eq('is_active', true);

    if (retrieveError) {
      console.log('❌ Failed to retrieve settings:', retrieveError.message);
    } else {
      console.log('✅ Email settings in database:');
      allSettings.forEach(setting => {
        const value = setting.setting_key === 'smtp_pass' ? '***HIDDEN***' : setting.setting_value;
        console.log(`   ${setting.setting_key}: ${value}`);
      });
    }

    console.log('\n🎉 Email settings setup complete!');
    console.log('📧 Your admin dashboard should now show email settings.');
    console.log('🧪 Test by going to admin dashboard → Email Settings');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n💡 Manual setup required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Create the email_settings table');
    console.log('3. Insert the SMTP configuration manually');
  }
}

// Run the setup
setupEmailSettings().catch(console.error);