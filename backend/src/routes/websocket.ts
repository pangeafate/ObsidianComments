// WebSocket status and monitoring endpoints

import { Router } from 'express';
import { roomManager } from '../websocket/rooms';

export const websocketRouter = Router();

// Get WebSocket server statistics
websocketRouter.get('/stats', (req, res) => {
  try {
    const stats = {
      roomCount: roomManager.getRoomCount(),
      totalContributors: roomManager.getTotalContributorCount(),
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting WebSocket stats:', error);
    res.status(500).json({ error: 'Failed to get WebSocket statistics' });
  }
});

// Get active rooms information
websocketRouter.get('/rooms', (req, res) => {
  try {
    const rooms = [];
    const roomsMap = roomManager['rooms'] as Map<string, any>;
    
    for (const [shareId, room] of roomsMap.entries()) {
      rooms.push({
        shareId,
        contributorCount: room.getContributorCount(),
        contributors: room.getContributorSummary(),
        documentVersion: room.documentState.version,
        lastModified: room.documentState.lastModified
      });
    }
    
    res.json({
      totalRooms: rooms.length,
      rooms
    });
  } catch (error) {
    console.error('Error getting rooms info:', error);
    res.status(500).json({ error: 'Failed to get rooms information' });
  }
});

// Get specific room information
websocketRouter.get('/rooms/:shareId', (req, res) => {
  try {
    const { shareId } = req.params;
    const room = roomManager.getRoom(shareId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json({
      shareId,
      contributorCount: room.getContributorCount(),
      contributors: room.getContributorSummary(),
      documentState: {
        version: room.documentState.version,
        lastModified: room.documentState.lastModified,
        operationCount: room.documentState.operations.length
      }
    });
  } catch (error) {
    console.error('Error getting room info:', error);
    res.status(500).json({ error: 'Failed to get room information' });
  }
});