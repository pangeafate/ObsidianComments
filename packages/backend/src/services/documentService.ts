import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PublishRequest } from '../utils/validation';

const prisma = new PrismaClient();

export interface PublishResult {
  id: string;
  url: string;
  publishedAt: string;
}

export async function publishDocument(data: PublishRequest): Promise<PublishResult> {
  const document = await prisma.document.create({
    data: {
      title: data.title,
      content: data.content,
      metadata: data.metadata
    }
  });

  return {
    id: document.id,
    url: `https://obsidiancomments.lakestrom.com/share/${document.id}`,
    publishedAt: document.publishedAt.toISOString()
  };
}