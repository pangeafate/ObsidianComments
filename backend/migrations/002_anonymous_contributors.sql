-- Migration 002: Add anonymous contributor support
-- Remove authentication requirement and add contributor tracking

-- Update shares table to support anonymous contributors
ALTER TABLE shares 
DROP CONSTRAINT IF EXISTS fk_shares_owner,
DROP COLUMN IF EXISTS owner_id,
ADD COLUMN IF NOT EXISTS creator_name VARCHAR(255) DEFAULT 'Anonymous',
ADD COLUMN IF NOT EXISTS last_editor_name VARCHAR(255) DEFAULT 'Anonymous',
ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_change_summary TEXT;

-- Create contributors table for tracking (optional future use)
CREATE TABLE IF NOT EXISTS contributors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    browser_id VARCHAR(255),
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_edits INTEGER DEFAULT 0
);

-- Create version history table for tracking all changes
CREATE TABLE IF NOT EXISTS note_versions (
    id SERIAL PRIMARY KEY,
    share_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    contributor_name VARCHAR(255) NOT NULL DEFAULT 'Anonymous',
    change_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version_number INTEGER NOT NULL,
    FOREIGN KEY (share_id) REFERENCES shares(share_id) ON DELETE CASCADE
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_note_versions_share_id ON note_versions(share_id);
CREATE INDEX IF NOT EXISTS idx_note_versions_created_at ON note_versions(created_at);

-- Update existing shares to have default creator names
UPDATE shares 
SET creator_name = 'Anonymous', 
    last_editor_name = 'Anonymous',
    edit_count = 0
WHERE creator_name IS NULL;

-- Add first version for existing shares
INSERT INTO note_versions (share_id, content, contributor_name, change_summary, version_number)
SELECT 
    share_id, 
    content, 
    'Anonymous' as contributor_name,
    'Initial version' as change_summary,
    1 as version_number
FROM shares 
WHERE share_id NOT IN (SELECT DISTINCT share_id FROM note_versions);

-- Update comments table to support anonymous contributors
ALTER TABLE comments 
DROP CONSTRAINT IF EXISTS comments_user_id_fkey,
DROP COLUMN IF EXISTS user_id,
ADD COLUMN IF NOT EXISTS contributor_name VARCHAR(255) DEFAULT 'Anonymous';

-- Update existing comments
UPDATE comments 
SET contributor_name = 'Anonymous' 
WHERE contributor_name IS NULL;