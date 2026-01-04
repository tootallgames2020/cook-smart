-- Create Lori Sears as Special User
-- Briana's mom - lifetime subscription access

-- Create or update user account
INSERT INTO users (
    email, 
    first_name, 
    last_name, 
    password_hash,
    is_special_user,
    welcome_screen_type,
    welcome_title,
    welcome_emoji,
    welcome_music_file,
    email_verified,
    created_at,
    updated_at
) VALUES (
    'boldtcu@gmail.com',
    'Lori',
    'Sears',
    '$2b$10$YourHashedPasswordHere', -- Will need to be updated with actual hash
    true,
    'special_user',
    'Welcome, Lori!',
    '🌺',
    'lori_song.mp3',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    is_special_user = true,
    welcome_screen_type = 'special_user',
    welcome_title = 'Welcome, Lori!',
    welcome_emoji = '🌺',
    welcome_music_file = 'lori_song.mp3',
    updated_at = NOW();

-- Get the user ID for content insertion
-- Note: This will be filled in with actual content when provided

-- Placeholder welcome content (to be updated with personalized message)
INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'letter_paragraph', 'Thank you for being such an important part of our family and for raising such an amazing daughter.', 1
FROM users WHERE email = 'boldtcu@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'letter_paragraph', 'Your support and love mean the world to us, and we''re so grateful to have you in our lives.', 2
FROM users WHERE email = 'boldtcu@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'letter_bold', 'Welcome to Cook Smart! You have lifetime access to all features as a special user.', 3
FROM users WHERE email = 'boldtcu@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'signature', 'With love,\nBrad', 4
FROM users WHERE email = 'boldtcu@gmail.com'
ON CONFLICT DO NOTHING;

-- Verify the user was created
SELECT 
    id,
    email,
    first_name,
    last_name,
    is_special_user,
    welcome_screen_type,
    welcome_title,
    welcome_emoji,
    welcome_music_file,
    created_at
FROM users 
WHERE email = 'boldtcu@gmail.com';

-- Verify welcome content
SELECT 
    uwc.content_type,
    uwc.content_text,
    uwc.display_order
FROM user_welcome_content uwc
JOIN users u ON uwc.user_id = u.id
WHERE u.email = 'boldtcu@gmail.com'
ORDER BY uwc.display_order;