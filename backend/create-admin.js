// Create Admin Account Script
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminAccount() {
  try {
    console.log('🔐 Creating admin account...');
    
    const adminEmail = 'management@bookmyreservation.org';
    const adminPassword = 'process.env.ADMIN_PASSWORD || 'changeme123'';
    
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('📧 Admin user already exists in auth, checking app_users...');
        
        // Get existing user
        const { data: existingAuth } = await supabase.auth.admin.listUsers();
        const adminUser = existingAuth.users.find(u => u.email === adminEmail);
        
        if (adminUser) {
          console.log('✅ Found existing admin auth user:', adminUser.id);
          
          // Check if user exists in app_users
          const { data: appUser, error: appUserError } = await supabase
            .from('app_users')
            .select('*')
            .eq('auth_id', adminUser.id)
            .single();
          
          if (appUserError && appUserError.code === 'PGRST116') {
            // User doesn't exist in app_users, create it
            const { data: newAppUser, error: createAppUserError } = await supabase
              .from('app_users')
              .insert({
                auth_id: adminUser.id,
                email: adminEmail,
                first_name: 'Admin',
                last_name: 'User',
                role: 'admin',
                is_admin: true,
                is_active: true,
                is_verified: true
              })
              .select()
              .single();
            
            if (createAppUserError) {
              console.error('❌ Error creating app_user:', createAppUserError);
              return;
            }
            
            console.log('✅ Created app_user record:', newAppUser.id);
          } else {
            console.log('✅ Admin already exists in app_users');
          }
        }
      } else {
        console.error('❌ Auth error:', authError);
        return;
      }
    } else {
      console.log('✅ Created auth user:', authData.user.id);
      
      // 2. Create user in app_users table
      const { data: appUser, error: appUserError } = await supabase
        .from('app_users')
        .insert({
          auth_id: authData.user.id,
          email: adminEmail,
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          is_admin: true,
          is_active: true,
          is_verified: true
        })
        .select()
        .single();

      if (appUserError) {
        console.error('❌ Error creating app_user:', appUserError);
        return;
      }
      
      console.log('✅ Created app_user:', appUser.id);
    }
    
    console.log('\n🎉 Admin account ready!');
    console.log('📧 Email: management@bookmyreservation.org');
    console.log('🔑 Password: process.env.ADMIN_PASSWORD || 'changeme123'');
    console.log('🌐 Login at: http://localhost:3001');
    
  } catch (error) {
    console.error('❌ Error creating admin account:', error);
  }
}

// Run the script
createAdminAccount();