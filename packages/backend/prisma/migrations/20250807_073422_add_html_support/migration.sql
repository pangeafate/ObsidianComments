-- Add HTML support to Document table
ALTER TABLE "documents" 
ADD COLUMN "htmlContent" TEXT,
ADD COLUMN "renderMode" VARCHAR(20) DEFAULT 'markdown';

-- Create index for performance on renderMode queries
CREATE INDEX "documents_renderMode_idx" ON "documents"("renderMode");