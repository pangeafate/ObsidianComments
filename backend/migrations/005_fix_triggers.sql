-- Migration 005: Fix trigger functions for shares table

-- Create separate trigger functions for shares and comments
CREATE OR REPLACE FUNCTION assign_comment_contributor_color()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate a pastel color based on contributor name hash
    INSERT INTO contributor_colors (contributor_name, color_hex)
    SELECT NEW.contributor_name, '#' || lpad(to_hex((hashtext(NEW.contributor_name) & 16777215) | 12632256), 6, '0')
    WHERE NOT EXISTS (SELECT 1 FROM contributor_colors WHERE contributor_name = NEW.contributor_name);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION assign_share_contributor_color()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate colors for creator and last editor
    IF NEW.creator_name IS NOT NULL THEN
        INSERT INTO contributor_colors (contributor_name, color_hex)
        SELECT NEW.creator_name, '#' || lpad(to_hex((hashtext(NEW.creator_name) & 16777215) | 12632256), 6, '0')
        WHERE NOT EXISTS (SELECT 1 FROM contributor_colors WHERE contributor_name = NEW.creator_name);
    END IF;
    
    IF NEW.last_editor_name IS NOT NULL AND NEW.last_editor_name != NEW.creator_name THEN
        INSERT INTO contributor_colors (contributor_name, color_hex)
        SELECT NEW.last_editor_name, '#' || lpad(to_hex((hashtext(NEW.last_editor_name) & 16777215) | 12632256), 6, '0')
        WHERE NOT EXISTS (SELECT 1 FROM contributor_colors WHERE contributor_name = NEW.last_editor_name);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate triggers with correct functions
DROP TRIGGER IF EXISTS trigger_assign_comment_color ON comments;
CREATE TRIGGER trigger_assign_comment_color
    BEFORE INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION assign_comment_contributor_color();

DROP TRIGGER IF EXISTS trigger_assign_share_color ON shares;
CREATE TRIGGER trigger_assign_share_color
    BEFORE INSERT OR UPDATE OF creator_name, last_editor_name ON shares
    FOR EACH ROW
    EXECUTE FUNCTION assign_share_contributor_color();