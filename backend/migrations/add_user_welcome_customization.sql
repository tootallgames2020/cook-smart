-- Migration: Add User Welcome Customization
-- This allows individual users to have personalized welcome screens

-- Add new fields to users table for welcome customization
ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_screen_type VARCHAR(50) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_music_file VARCHAR(100) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_title VARCHAR(200) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_emoji VARCHAR(10) DEFAULT NULL;

-- Create table for personalized welcome content
CREATE TABLE IF NOT EXISTS user_welcome_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL, -- 'letter', 'signature', 'postscript', etc.
    content_text TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_welcome_content_user_id ON user_welcome_content(user_id);
CREATE INDEX IF NOT EXISTS idx_user_welcome_content_type ON user_welcome_content(user_id, content_type);

-- Insert welcome content for existing special users

-- Briana (Creator) - Assuming her email, you'll need to update this
INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'letter_paragraph', 'This is all because of you - and you''re so much more than just the inspiration behind Cook Smart.', 1
FROM users WHERE is_creator = true
ON CONFLICT DO NOTHING;

INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'letter_paragraph', 'You''ve changed my life in ways I don''t say out loud nearly enough. You''re not just my partner - you''re my best friend, my voice of reason, and the person who makes every day better just by being in it.', 2
FROM users WHERE is_creator = true
ON CONFLICT DO NOTHING;

INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'letter_paragraph', 'Watching you as a mother has shown me what unconditional love really looks like. The way you nurture, protect, and guide with such grace and strength - it''s beautiful and inspiring every single day.', 3
FROM users WHERE is_creator = true
ON CONFLICT DO NOTHING;

INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'letter_paragraph', 'Being out on the road, mile after mile, I think about you constantly. Every sunset I see through the windshield, I wish you were there to share it. Every truck stop, every lonely night in the cab - I''m counting down until I can come home to you and the kids.', 4
FROM users WHERE is_creator = true
ON CONFLICT DO NOTHING;

INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'letter_paragraph', 'This app journey isn''t just about building something successful. It''s about building a future where I don''t have to choose between providing for our family and being present for the moments that matter. Where I can be there for bedtime stories, morning coffee with you, and all the little moments I''m missing now.', 5
FROM users WHERE is_creator = true
ON CONFLICT DO NOTHING;

INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'letter_paragraph', 'You see solutions where others see problems. That conversation about recipe apps wasn''t just frustration - it was your brilliant mind identifying what millions of people needed. Your insight that people need recipes for the real world is now helping families everywhere.', 6
FROM users WHERE is_creator = true
ON CONFLICT DO NOTHING;

INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'letter_paragraph', 'I love your intelligence, your heart, your strength, and how you hold everything together when I can''t be there.', 7
FROM users WHERE is_creator = true
ON CONFLICT DO NOTHING;

INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'letter_bold', 'Welcome to Cook Smart, Co-Founder. This is our chance to build the life we both dream of.', 8
FROM users WHERE is_creator = true
ON CONFLICT DO NOTHING;

INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'signature', 'All my love from wherever these wheels take me,\nBrad', 9
FROM users WHERE is_creator = true
ON CONFLICT DO NOTHING;

INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'postscript', 'P.S. - Maybe someday soon, I won''t have to end messages with "from the road."', 10
FROM users WHERE is_creator = true
ON CONFLICT DO NOTHING;

-- Donna (Mom) - Special User content
INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'letter_paragraph', 'When I was a kid, you worked your tail off to make sure I had everything I needed. I may not have always had what I wanted, but I always had what I needed. Things weren''t always perfect, but I miss those days more than you know.', 1
FROM users WHERE is_special_user = true AND is_creator = false
ON CONFLICT DO NOTHING;

INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'letter_paragraph', 'Growing up, we had our disagreements - I see that now for what it really was. You just wanted the best for me, even when I couldn''t see it.', 2
FROM users WHERE is_special_user = true AND is_creator = false
ON CONFLICT DO NOTHING;

INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'letter_paragraph', 'I''ve tried so many different paths in life, and I know you''ve worried about me through all of them. These past few years on the road have taken me almost 1,000 miles away, and the distance has cost me something I can never get back - time with you and our family.', 3
FROM users WHERE is_special_user = true AND is_creator = false
ON CONFLICT DO NOTHING;

INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'letter_paragraph', 'I know growing up means going out on your own, and I''ve tried my best to do that. But I''ve missed too much. Too many moments. Too much time with the people who matter most.', 4
FROM users WHERE is_special_user = true AND is_creator = false
ON CONFLICT DO NOTHING;

INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'letter_paragraph', 'This app is part of something bigger I''m working toward - a way to build a life where I don''t have to choose between providing and being present. Where I can be there for the moments that matter.', 5
FROM users WHERE is_special_user = true AND is_creator = false
ON CONFLICT DO NOTHING;

INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'letter_bold', 'I just want you to know that I love you. I''m so grateful for everything you sacrificed, for every time you pointed me in the right direction even when I didn''t want to hear it, and for being the mother who gave me everything I needed to become who I am.', 6
FROM users WHERE is_special_user = true AND is_creator = false
ON CONFLICT DO NOTHING;

INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'letter_bold', 'Thank you, Mom. For everything.', 7
FROM users WHERE is_special_user = true AND is_creator = false
ON CONFLICT DO NOTHING;

INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
SELECT id, 'signature', 'With all my love,\nBrad', 8
FROM users WHERE is_special_user = true AND is_creator = false
ON CONFLICT DO NOTHING;

-- Update users table with welcome screen settings
UPDATE users SET 
    welcome_screen_type = 'creator',
    welcome_music_file = 'briana_song.mp3',
    welcome_title = 'Welcome Home, Briana!',
    welcome_emoji = '💕'
WHERE is_creator = true;

UPDATE users SET 
    welcome_screen_type = 'special_user',
    welcome_music_file = 'mom_song.mp3', 
    welcome_title = 'Welcome, Mom!',
    welcome_emoji = '💐'
WHERE is_special_user = true AND is_creator = false;

-- Add comments
COMMENT ON TABLE user_welcome_content IS 'Stores personalized welcome screen content for individual users';
COMMENT ON COLUMN users.welcome_screen_type IS 'Type of welcome screen (creator, special_user, custom)';
COMMENT ON COLUMN users.welcome_music_file IS 'Music file to play on welcome screen';
COMMENT ON COLUMN users.welcome_title IS 'Custom title for welcome screen';
COMMENT ON COLUMN users.welcome_emoji IS 'Emoji to display on welcome screen';