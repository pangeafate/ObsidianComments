// Mock API responses for testing

export const API_RESPONSES = {
  share: {
    success: {
      status: 200,
      data: {
        shareUrl: 'https://obsidiancomments.serverado.app/editor/abc123def456',
        shareId: 'abc123def456',
        createdAt: '2024-01-01T00:00:00.000Z',
        permissions: 'edit'
      }
    },
    
    invalidApiKey: {
      status: 401,
      error: {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key. Please check your settings.'
      }
    },
    
    networkError: {
      status: 0,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to sharing service. Please check your internet connection.'
      }
    },
    
    serverError: {
      status: 500,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Server error. Please try again later.'
      }
    },
    
    rateLimited: {
      status: 429,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please wait before trying again.'
      }
    }
  },
  
  update: {
    success: {
      status: 200,
      data: {
        shareId: 'abc123def456',
        updatedAt: '2024-01-01T12:00:00.000Z',
        version: 2
      }
    },
    
    notFound: {
      status: 404,
      error: {
        code: 'SHARE_NOT_FOUND',
        message: 'Shared note not found. It may have been deleted.'
      }
    }
  },
  
  delete: {
    success: {
      status: 200,
      data: {
        message: 'Share deleted successfully'
      }
    },
    
    notFound: {
      status: 404,
      error: {
        code: 'SHARE_NOT_FOUND',
        message: 'Shared note not found or already deleted.'
      }
    }
  },
  
  list: {
    success: {
      status: 200,
      data: {
        shares: [
          {
            shareId: 'abc123def456',
            title: 'Test Note 1',
            shareUrl: 'https://obsidiancomments.serverado.app/editor/abc123def456',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T12:00:00.000Z',
            permissions: 'edit',
            views: 42,
            editors: 3
          },
          {
            shareId: 'def456ghi789',
            title: 'Test Note 2',
            shareUrl: 'https://obsidiancomments.serverado.app/editor/def456ghi789',
            createdAt: '2024-01-02T00:00:00.000Z',
            updatedAt: '2024-01-02T08:00:00.000Z',
            permissions: 'view',
            views: 15,
            editors: 0
          }
        ],
        total: 2
      }
    },
    
    empty: {
      status: 200,
      data: {
        shares: [],
        total: 0
      }
    }
  },
  
  auth: {
    test: {
      success: {
        status: 200,
        data: {
          valid: true,
          user: {
            id: 'user123',
            email: 'test@example.com'
          },
          limits: {
            maxShares: 100,
            currentShares: 5
          }
        }
      },
      
      invalid: {
        status: 401,
        error: {
          code: 'INVALID_API_KEY',
          message: 'API key is invalid or expired'
        }
      }
    }
  }
};

export const createMockFetch = (response: any, ok = true, status = 200) => {
  return jest.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  });
};

export const createMockNetworkError = () => {
  return jest.fn().mockRejectedValue(new Error('Network request failed'));
};

export const createMockTimeoutError = () => {
  return jest.fn().mockRejectedValue(new Error('Request timeout'));
};

// Helper to create mock responses for different scenarios
export const mockApiCall = (endpoint: string, method: string, scenario: string) => {
  const responses: Record<string, any> = {
    'POST /api/notes/share success': API_RESPONSES.share.success,
    'POST /api/notes/share invalid-key': API_RESPONSES.share.invalidApiKey,
    'POST /api/notes/share network-error': API_RESPONSES.share.networkError,
    'PUT /api/notes/:id success': API_RESPONSES.update.success,
    'PUT /api/notes/:id not-found': API_RESPONSES.update.notFound,
    'DELETE /api/notes/:id success': API_RESPONSES.delete.success,
    'GET /api/notes success': API_RESPONSES.list.success,
    'GET /api/auth/test success': API_RESPONSES.auth.test.success,
    'GET /api/auth/test invalid': API_RESPONSES.auth.test.invalid,
  };
  
  const key = `${method} ${endpoint} ${scenario}`;
  return responses[key] || { status: 404, error: 'Mock not found' };
};