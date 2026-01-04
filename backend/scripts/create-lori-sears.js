#!/usr/bin/env node

/**
 * Create Lori Sears as Special User
 * Briana's mom - lifetime subscription access
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function createLoriSears() {
  try {
    console.log('👤 Creating Lori Sears as Special User...\n');
    
    // User details
    const userDetails = {
      email: 'boldtcu@gmail.com',
      firstName: 'Lori',
      lastName: 'Sears',
      password: 'Cuba#1',
      welcomeTitle: 'Welcome, Lori!',
      welcomeEmoji: '🌺',
      musicFile: 'lori_song.mp3'
    };
    
    console.log('📋 User Details:');
    console.log(`Email: ${userDetails.email}`);
    console.log(`Name: ${userDetails.firstName} ${userDetails.lastName}`);
    console.log(`Title: ${userDetails.welcomeTitle}`);
    console.log(`Emoji: ${userDetails.welcomeEmoji}`);
    console.log(`Music: ${userDetails.musicFile}`);
    console.log(`Relationship: Briana's mom`);
    console.log(`Access: Special User - Lifetime`);
    
    // Hash the password
    console.log('\n🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(userDetails.password, 10);
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id, email FROM users WHERE email = $1',
        [userDetails.email]
      );
      
      let userId;
      
      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
        console.log('👤 User already exists, updating...');
        
        // Update existing user
        await client.query(
          `UPDATE users SET 
           first_name = $1,
           last_name = $2,
           password_hash = $3,
           is_special_user = true,
           has_lifetime_subscription = true,
           subscription_status = 'lifetime',
           welcome_screen_type = 'special_user',
           welcome_title = $4,
           welcome_emoji = $5,
           welcome_music_file = $6,
           updated_at = NOW()
           WHERE email = $7`,
          [
            userDetails.firstName, 
            userDetails.lastName, 
            passwordHash,
            userDetails.welcomeTitle, 
            userDetails.welcomeEmoji, 
            userDetails.musicFile, 
            userDetails.email
          ]
        );
      } else {
        console.log('👤 Creating new user...');
        
        // Create new user
        const userResult = await client.query(
          `INSERT INTO users (
            email, first_name, last_name, password_hash, 
            is_special_user, has_lifetime_subscription, subscription_status,
            welcome_screen_type, welcome_title, 
            welcome_emoji, welcome_music_file, email_verified
          ) VALUES ($1, $2, $3, $4, true, true, 'lifetime', 'special_user', $5, $6, $7, true)
          RETURNING id`,
          [
            userDetails.email, 
            userDetails.firstName, 
            userDetails.lastName, 
            passwordHash,
            userDetails.welcomeTitle, 
            userDetails.welcomeEmoji, 
            userDetails.musicFile
          ]
        );
        userId = userResult.rows[0].id;
      }
      
      // Delete existing welcome content
      await client.query(
        'DELETE FROM user_welcome_content WHERE user_id = $1',
        [userId]
      );
      
      // Insert placeholder welcome content (will be updated with personalized message later)
      const placeholderContent = [
        {
          type: 'letter_paragraph',
          text: 'Thank you for being such an important part of our family and for raising such an amazing daughter.',
          order: 1
        },
        {
          type: 'letter_paragraph', 
          text: 'Your support and love mean the world to us, and we\'re so grateful to have you in our lives.',
          order: 2
        },
        {
          type: 'letter_bold',
          text: 'Welcome to Cook Smart! You have lifetime access to all features as a special user.',
          order: 3
        },
        {
          type: 'signature',
          text: 'With love,\nBrad',
          order: 4
        }
      ];
      
      console.log('📝 Adding placeholder welcome content...');
      for (const content of placeholderContent) {
        await client.query(
          `INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
           VALUES ($1, $2, $3, $4)`,
          [userId, content.type, content.text, content.order]
        );
      }
      
      await client.query('COMMIT');
      
      console.log('\n✅ Lori Sears created successfully!');
      console.log(`👤 User ID: ${userId}`);
      console.log(`📧 Email: ${userDetails.email}`);
      console.log(`🔑 Password: ${userDetails.password}`);
      console.log(`🎵 Music file: ${userDetails.musicFile}`);
      console.log(`🌺 Welcome emoji: ${userDetails.welcomeEmoji}`);
      
      // Verify the creation
      const verification = await client.query(
        `SELECT 
          u.id, u.email, u.first_name, u.last_name, u.is_special_user,
          u.has_lifetime_subscription, u.subscription_status,
          u.welcome_screen_type, u.welcome_title, u.welcome_emoji, u.welcome_music_file,
          COUNT(uwc.id) as content_count
         FROM users u
         LEFT JOIN user_welcome_content uwc ON u.id = uwc.user_id
         WHERE u.email = $1
         GROUP BY u.id, u.email, u.first_name, u.last_name, u.is_special_user,
                  u.has_lifetime_subscription, u.subscription_status,
                  u.welcome_screen_type, u.welcome_title, u.welcome_emoji, u.welcome_music_file`,
        [userDetails.email]
      );
      
      if (verification.rows.length > 0) {
        const user = verification.rows[0];
        console.log('\n📊 Verification:');
        console.log(`✅ User created: ${user.first_name} ${user.last_name}`);
        console.log(`✅ Special user flag: ${user.is_special_user}`);
        console.log(`✅ Lifetime subscription: ${user.has_lifetime_subscription}`);
        console.log(`✅ Subscription status: ${user.subscription_status}`);
        console.log(`✅ Welcome screen type: ${user.welcome_screen_type}`);
        console.log(`✅ Welcome content items: ${user.content_count}`);
      }
      
      console.log('\n📱 Next Steps:');
      console.log('1. Lori can now log in with her credentials');
      console.log('2. She will see a placeholder welcome screen');
      console.log('3. Provide her personalized note and song details');
      console.log('4. Update her welcome content with the personalized message');
      console.log('5. Add her music file (lori_song.mp3) to mobile app assets');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error creating Lori Sears:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
createLoriSears();