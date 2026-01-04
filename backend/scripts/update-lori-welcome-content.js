#!/usr/bin/env node

/**
 * Update Lori Sears' Welcome Content
 * Run this script after getting her personalized note and song details
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Lori's personalized welcome message from her daughter
const LORI_WELCOME_CONTENT = {
  title: 'Welcome, Mom',
  emoji: '💕',
  musicFile: 'lori_song.mp3', // Update with actual filename
  content: {
    paragraphs: [
      'Mom, If you\'re reading this, it means you\'ve just opened something I built with you in mind. I want you to know first and foremost that this app isn\'t just software to me—it\'s a small reflection of everything you\'ve given me over the years.',
      'Your strength, your patience, your encouragement, and the quiet ways you\'ve always believed in me even when I doubted myself. Those things shaped who I am far more than you probably realize.',
      'There were times when things weren\'t easy, times when the road was unclear, but you kept going. You showed me what resilience looks like. You showed me how to love deeply, how to keep learning, and how to keep trying even when the outcome isn\'t guaranteed.',
      'Those lessons are built into me, and in a way, they\'re built into this too.',
      'This app is here to help, to support, and to make things a little easier—just like you\'ve always tried to do for me. I hope that every time you open it, you feel how much you matter, how appreciated you are, and how proud I am to call you my mom.',
      'Thank you for everything you\'ve done, everything you still do, and everything you are. I love you more than words can ever fully say.'
    ],
    boldParagraphs: [
      // No bold paragraphs needed - the message speaks for itself
    ],
    signature: 'Love always,\nSweetpea',
    postscript: '' // Optional - add if needed
  }
};

async function updateLoriWelcomeContent() {
  try {
    console.log('📝 Updating Lori Sears\' Welcome Content...\n');
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Find Lori's user ID
      const userResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        ['boldtcu@gmail.com']
      );
      
      if (userResult.rows.length === 0) {
        throw new Error('Lori Sears not found. Please run create-lori-sears.js first.');
      }
      
      const userId = userResult.rows[0].id;
      console.log(`👤 Found Lori Sears (ID: ${userId})`);
      
      // Update user's welcome settings
      await client.query(
        `UPDATE users SET 
         welcome_title = $1,
         welcome_emoji = $2,
         welcome_music_file = $3,
         updated_at = NOW()
         WHERE id = $4`,
        [LORI_WELCOME_CONTENT.title, LORI_WELCOME_CONTENT.emoji, LORI_WELCOME_CONTENT.musicFile, userId]
      );
      
      // Delete existing welcome content
      await client.query(
        'DELETE FROM user_welcome_content WHERE user_id = $1',
        [userId]
      );
      
      console.log('🗑️ Cleared existing welcome content');
      
      // Insert new welcome content
      let displayOrder = 1;
      
      // Insert paragraphs
      console.log(`📄 Adding ${LORI_WELCOME_CONTENT.content.paragraphs.length} paragraphs...`);
      for (const paragraph of LORI_WELCOME_CONTENT.content.paragraphs) {
        await client.query(
          `INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
           VALUES ($1, 'letter_paragraph', $2, $3)`,
          [userId, paragraph, displayOrder++]
        );
      }
      
      // Insert bold paragraphs
      console.log(`📄 Adding ${LORI_WELCOME_CONTENT.content.boldParagraphs.length} bold paragraphs...`);
      for (const paragraph of LORI_WELCOME_CONTENT.content.boldParagraphs) {
        await client.query(
          `INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
           VALUES ($1, 'letter_bold', $2, $3)`,
          [userId, paragraph, displayOrder++]
        );
      }
      
      // Insert signature
      if (LORI_WELCOME_CONTENT.content.signature) {
        console.log('✍️ Adding signature...');
        await client.query(
          `INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
           VALUES ($1, 'signature', $2, $3)`,
          [userId, LORI_WELCOME_CONTENT.content.signature, displayOrder++]
        );
      }
      
      // Insert postscript
      if (LORI_WELCOME_CONTENT.content.postscript) {
        console.log('📝 Adding postscript...');
        await client.query(
          `INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
           VALUES ($1, 'postscript', $2, $3)`,
          [userId, LORI_WELCOME_CONTENT.content.postscript, displayOrder++]
        );
      }
      
      await client.query('COMMIT');
      
      console.log('\n✅ Lori\'s welcome content updated successfully!');
      
      // Verify the update
      const verification = await client.query(
        `SELECT 
          u.welcome_title, u.welcome_emoji, u.welcome_music_file,
          COUNT(uwc.id) as content_count
         FROM users u
         LEFT JOIN user_welcome_content uwc ON u.id = uwc.user_id
         WHERE u.email = 'boldtcu@gmail.com'
         GROUP BY u.welcome_title, u.welcome_emoji, u.welcome_music_file`
      );
      
      if (verification.rows.length > 0) {
        const result = verification.rows[0];
        console.log('\n📊 Updated Content:');
        console.log(`🏷️ Title: ${result.welcome_title}`);
        console.log(`🌺 Emoji: ${result.welcome_emoji}`);
        console.log(`🎵 Music: ${result.welcome_music_file}`);
        console.log(`📄 Content items: ${result.content_count}`);
      }
      
      // Show the content
      const contentResult = await client.query(
        `SELECT content_type, content_text, display_order
         FROM user_welcome_content uwc
         JOIN users u ON uwc.user_id = u.id
         WHERE u.email = 'boldtcu@gmail.com'
         ORDER BY display_order`
      );
      
      console.log('\n📖 Welcome Content Preview:');
      contentResult.rows.forEach((row, index) => {
        const preview = row.content_text.length > 80 
          ? row.content_text.substring(0, 80) + '...'
          : row.content_text;
        console.log(`${index + 1}. [${row.content_type}] ${preview}`);
      });
      
      console.log('\n📱 Next Steps:');
      console.log('1. Add lori_song.mp3 to mobile app assets');
      console.log('2. Test Lori\'s login and welcome screen');
      console.log('3. Verify personalized content displays correctly');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error updating Lori\'s welcome content:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
updateLoriWelcomeContent();