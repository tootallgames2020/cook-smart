#!/usr/bin/env node

/**
 * Script to add a new special user with custom welcome content
 * Usage: node add-new-special-user.js
 */

const { Pool } = require('pg');
const readline = require('readline');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function addNewSpecialUser() {
  try {
    console.log('🎉 Cook Smart - Add New Special User\n');
    
    // Get user details
    const email = await question('Enter email address: ');
    const firstName = await question('Enter first name: ');
    const lastName = await question('Enter last name: ');
    const welcomeTitle = await question('Enter welcome screen title (e.g., "Welcome, Sarah!"): ');
    const welcomeEmoji = await question('Enter welcome emoji (e.g., 🌸): ');
    const musicFile = await question('Enter music file name (e.g., "sarah_song.mp3"): ');
    
    console.log('\n📝 Now enter the welcome letter content. Press Enter twice when done with each section.\n');
    
    // Get letter paragraphs
    const paragraphs = [];
    console.log('Enter regular paragraphs (press Enter twice to finish each paragraph, type "DONE" to finish):');
    while (true) {
      const paragraph = await question('Paragraph: ');
      if (paragraph.toUpperCase() === 'DONE') break;
      if (paragraph.trim()) paragraphs.push(paragraph.trim());
    }
    
    // Get bold paragraphs
    const boldParagraphs = [];
    console.log('\nEnter bold/emphasized paragraphs (type "DONE" to finish):');
    while (true) {
      const paragraph = await question('Bold paragraph: ');
      if (paragraph.toUpperCase() === 'DONE') break;
      if (paragraph.trim()) boldParagraphs.push(paragraph.trim());
    }
    
    const signature = await question('\nEnter signature (e.g., "With love,\\nBrad"): ');
    const postscript = await question('Enter postscript (optional): ');
    
    // Confirm details
    console.log('\n📋 User Details:');
    console.log(`Email: ${email}`);
    console.log(`Name: ${firstName} ${lastName}`);
    console.log(`Title: ${welcomeTitle}`);
    console.log(`Emoji: ${welcomeEmoji}`);
    console.log(`Music: ${musicFile}`);
    console.log(`Paragraphs: ${paragraphs.length}`);
    console.log(`Bold paragraphs: ${boldParagraphs.length}`);
    console.log(`Signature: ${signature}`);
    if (postscript) console.log(`Postscript: ${postscript}`);
    
    const confirm = await question('\nCreate this user? (y/N): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ Cancelled');
      return;
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
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
           is_special_user = true,
           welcome_screen_type = 'special_user',
           welcome_title = $3,
           welcome_emoji = $4,
           welcome_music_file = $5,
           updated_at = NOW()
           WHERE email = $6`,
          [firstName, lastName, welcomeTitle, welcomeEmoji, musicFile, email]
        );
      } else {
        console.log('👤 Creating new user...');
        
        // Create new user
        const userResult = await client.query(
          `INSERT INTO users (
            email, first_name, last_name, password_hash, 
            is_special_user, welcome_screen_type, welcome_title, 
            welcome_emoji, welcome_music_file, email_verified
          ) VALUES ($1, $2, $3, $4, true, 'special_user', $5, $6, $7, true)
          RETURNING id`,
          [
            email, firstName, lastName, 
            '$2b$10$defaulthashforspecialusers', // Default hash - they'll reset password
            welcomeTitle, welcomeEmoji, musicFile
          ]
        );
        userId = userResult.rows[0].id;
      }
      
      // Delete existing welcome content
      await client.query(
        'DELETE FROM user_welcome_content WHERE user_id = $1',
        [userId]
      );
      
      // Insert new welcome content
      let displayOrder = 1;
      
      // Insert paragraphs
      for (const paragraph of paragraphs) {
        await client.query(
          `INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
           VALUES ($1, 'letter_paragraph', $2, $3)`,
          [userId, paragraph, displayOrder++]
        );
      }
      
      // Insert bold paragraphs
      for (const paragraph of boldParagraphs) {
        await client.query(
          `INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
           VALUES ($1, 'letter_bold', $2, $3)`,
          [userId, paragraph, displayOrder++]
        );
      }
      
      // Insert signature
      if (signature) {
        await client.query(
          `INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
           VALUES ($1, 'signature', $2, $3)`,
          [userId, signature, displayOrder++]
        );
      }
      
      // Insert postscript
      if (postscript) {
        await client.query(
          `INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
           VALUES ($1, 'postscript', $2, $3)`,
          [userId, postscript, displayOrder++]
        );
      }
      
      await client.query('COMMIT');
      
      console.log('✅ Special user created successfully!');
      console.log(`👤 User ID: ${userId}`);
      console.log(`📧 Email: ${email}`);
      console.log(`🎵 Music file: ${musicFile}`);
      console.log('\n📱 The user can now log in and will see their personalized welcome screen.');
      console.log('🔑 They should reset their password on first login.');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error creating special user:', error);
  } finally {
    rl.close();
    await pool.end();
  }
}

// Run the script
addNewSpecialUser();