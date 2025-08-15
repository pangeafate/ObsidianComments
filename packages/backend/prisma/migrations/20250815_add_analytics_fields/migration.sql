-- Add analytics fields to Document table
ALTER TABLE "documents" 
ADD COLUMN "views" INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN "activeEditors" INTEGER DEFAULT 0 NOT NULL;

-- Create indexes for performance on analytics queries
CREATE INDEX "documents_views_idx" ON "documents"("views");
CREATE INDEX "documents_activeEditors_idx" ON "documents"("activeEditors");