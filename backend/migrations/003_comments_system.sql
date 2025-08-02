-- Migration 003: Add comments system with text anchoring
-- Support for sidebar comments anchored to specific text positions

-- Create comments table with text position anchoring
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    share_id VARCHAR(255) NOT NULL,
    contributor_name VARCHAR(255) NOT NULL DEFAULT 'Anonymous',
    content TEXT NOT NULL,
    -- Text position anchoring (character positions in document)
    position_start INTEGER NOT NULL,
    position_end INTEGER NOT NULL,
    version_number INTEGER NOT NULL, -- which document version this comment refers to
    -- Threading support for replies
    parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_resolved BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (share_id) REFERENCES shares(share_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_share_id ON comments(share_id);
CREATE INDEX IF NOT EXISTS idx_comments_position ON comments(share_id, position_start, position_end);
CREATE INDEX IF NOT EXISTS idx_comments_active ON comments(share_id, is_active);
CREATE INDEX IF NOT EXISTS idx_comments_threading ON comments(parent_comment_id);

-- Create contributor colors table for consistent color assignment
CREATE TABLE IF NOT EXISTS contributor_colors (
    contributor_name VARCHAR(255) PRIMARY KEY,
    color_hex VARCHAR(7) NOT NULL, -- #FFB6C1 style hex colors
    color_name VARCHAR(50), -- human readable name like "Light Pink"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert predefined pastel colors for first contributors
INSERT INTO contributor_colors (contributor_name, color_hex, color_name) VALUES
('Anonymous', '#E0E0E0', 'Light Gray'),
('Alice', '#FFB6C1', 'Light Pink'),
('Bob', '#B6E5D8', 'Light Turquoise'),
('Charlie', '#A8E6CF', 'Light Green'),
('Diana', '#FFD3A5', 'Light Orange'),
('Eve', '#FFAAA5', 'Light Coral'),
('Frank', '#C7CEEA', 'Light Lavender'),
('Grace', '#B5EAD7', 'Light Mint'),
('Henry', '#F7DC6F', 'Light Yellow')
ON CONFLICT (contributor_name) DO NOTHING;

-- Create function to auto-assign colors to new contributors
CREATE OR REPLACE FUNCTION assign_contributor_color()
RETURNS TRIGGER AS $$
DECLARE
    new_color VARCHAR(7);
    color_count INTEGER;
    base_colors VARCHAR(7)[] := ARRAY['#FFB6C1', '#B6E5D8', '#A8E6CF', '#FFD3A5', '#FFAAA5', '#C7CEEA', '#B5EAD7', '#F7DC6F', '#FFF0E6', '#E6F3FF'];
BEGIN
    -- Check if color already exists for this contributor
    IF NOT EXISTS (SELECT 1 FROM contributor_colors WHERE contributor_name = NEW.contributor_name) THEN
        -- Count existing contributors to determine which color to use
        SELECT COUNT(*) INTO color_count FROM contributor_colors;
        
        -- Use predefined colors for first 10 contributors, then generate based on hash
        IF color_count < array_length(base_colors, 1) THEN
            new_color := base_colors[color_count + 1];
        ELSE
            -- Generate pastel color based on name hash for contributors beyond the first 10
            new_color := '#' || lpad(to_hex((hashtext(NEW.contributor_name) & 16777215) | 12632256), 6, '0');
        END IF;
        
        -- Insert the new color assignment
        INSERT INTO contributor_colors (contributor_name, color_hex) 
        VALUES (NEW.contributor_name, new_color)
        ON CONFLICT (contributor_name) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-assign colors when comments are created
CREATE OR REPLACE TRIGGER trigger_assign_comment_color
    BEFORE INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION assign_contributor_color();

-- Also trigger for shares table to assign colors when notes are created/updated
CREATE OR REPLACE TRIGGER trigger_assign_share_color
    BEFORE INSERT OR UPDATE ON shares
    FOR EACH ROW
    EXECUTE FUNCTION assign_contributor_color();

-- Update existing contributor colors for any existing data
INSERT INTO contributor_colors (contributor_name, color_hex)
SELECT DISTINCT creator_name, '#E0E0E0'
FROM shares 
WHERE creator_name IS NOT NULL 
  AND creator_name NOT IN (SELECT contributor_name FROM contributor_colors)
ON CONFLICT (contributor_name) DO NOTHING;

INSERT INTO contributor_colors (contributor_name, color_hex)
SELECT DISTINCT last_editor_name, '#F0F0F0'
FROM shares 
WHERE last_editor_name IS NOT NULL 
  AND last_editor_name NOT IN (SELECT contributor_name FROM contributor_colors)
ON CONFLICT (contributor_name) DO NOTHING;