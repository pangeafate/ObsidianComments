-- Migration 004: Fix comments system for production
-- Update existing tables to match expected schema

-- First run migration 002 changes that might be missing
ALTER TABLE shares 
DROP CONSTRAINT IF EXISTS fk_shares_owner,
DROP COLUMN IF EXISTS owner_id,
ADD COLUMN IF NOT EXISTS creator_name VARCHAR(255) DEFAULT 'Anonymous',
ADD COLUMN IF NOT EXISTS last_editor_name VARCHAR(255) DEFAULT 'Anonymous',
ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_change_summary TEXT;

-- Update existing shares to have default creator names
UPDATE shares 
SET creator_name = COALESCE(creator_name, 'Anonymous'), 
    last_editor_name = COALESCE(last_editor_name, 'Anonymous'),
    edit_count = COALESCE(edit_count, 0)
WHERE creator_name IS NULL OR last_editor_name IS NULL OR edit_count IS NULL;

-- Create version history table if not exists
CREATE TABLE IF NOT EXISTS note_versions (
    id SERIAL PRIMARY KEY,
    share_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    contributor_name VARCHAR(255) NOT NULL DEFAULT 'Anonymous',
    change_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version_number INTEGER NOT NULL
);

-- Create indexes for version history
CREATE INDEX IF NOT EXISTS idx_note_versions_share_id ON note_versions(share_id);
CREATE INDEX IF NOT EXISTS idx_note_versions_created_at ON note_versions(created_at);

-- Update comments table structure
ALTER TABLE comments 
DROP CONSTRAINT IF EXISTS comments_user_id_fkey,
DROP COLUMN IF EXISTS user_id,
DROP COLUMN IF EXISTS line_number,
ADD COLUMN IF NOT EXISTS contributor_name VARCHAR(255) DEFAULT 'Anonymous',
ADD COLUMN IF NOT EXISTS position_start INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS position_end INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT false;

-- Update existing comments
UPDATE comments 
SET contributor_name = COALESCE(contributor_name, 'Anonymous'),
    position_start = COALESCE(position_start, 0),
    position_end = COALESCE(position_end, 0),
    version_number = COALESCE(version_number, 1),
    is_resolved = COALESCE(is_resolved, false)
WHERE contributor_name IS NULL OR position_start IS NULL OR position_end IS NULL 
   OR version_number IS NULL OR is_resolved IS NULL;

-- Create indexes for comments
CREATE INDEX IF NOT EXISTS idx_comments_share_id ON comments(share_id);
CREATE INDEX IF NOT EXISTS idx_comments_position ON comments(position_start, position_end);
CREATE INDEX IF NOT EXISTS idx_comments_contributor ON comments(contributor_name);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);

-- Ensure contributor_colors table exists with proper structure
DROP TABLE IF EXISTS contributor_colors;
CREATE TABLE contributor_colors (
    contributor_name VARCHAR(255) PRIMARY KEY,
    color_hex VARCHAR(7) NOT NULL,
    color_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert predefined pastel colors
INSERT INTO contributor_colors (contributor_name, color_hex, color_name) VALUES
('Anonymous', '#E0E0E0', 'Light Gray'),
('DefaultUser', '#FFE4E1', 'Misty Rose'),
('TestUser', '#E0FFFF', 'Light Cyan'),
('Guest', '#F0FFF0', 'Honeydew'),
('Visitor', '#FFF8DC', 'Cornsilk'),
('Contributor', '#F5F5DC', 'Beige'),
('Editor', '#FFEFD5', 'Papaya Whip'),
('Reviewer', '#E6E6FA', 'Lavender'),
('Collaborator', '#F0FFFF', 'Azure'),
('Author', '#FFFAF0', 'Floral White')
ON CONFLICT (contributor_name) DO NOTHING;

-- Create function to auto-assign colors for new contributors
CREATE OR REPLACE FUNCTION assign_contributor_color()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate a pastel color based on contributor name hash
    INSERT INTO contributor_colors (contributor_name, color_hex)
    SELECT NEW.contributor_name, '#' || lpad(to_hex((hashtext(NEW.contributor_name) & 16777215) | 12632256), 6, '0')
    WHERE NOT EXISTS (SELECT 1 FROM contributor_colors WHERE contributor_name = NEW.contributor_name);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-assign colors
DROP TRIGGER IF EXISTS trigger_assign_comment_color ON comments;
CREATE TRIGGER trigger_assign_comment_color
    BEFORE INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION assign_contributor_color();

DROP TRIGGER IF EXISTS trigger_assign_share_color ON shares;
CREATE TRIGGER trigger_assign_share_color
    BEFORE INSERT OR UPDATE OF creator_name, last_editor_name ON shares
    FOR EACH ROW
    EXECUTE FUNCTION assign_contributor_color();