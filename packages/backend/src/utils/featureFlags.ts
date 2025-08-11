/**
 * Feature Flags System for ObsidianComments
 * Allows safe deployment of features behind flags
 */

interface FeatureFlags {
  // Core features
  COLLABORATIVE_EDITING: boolean;
  REAL_TIME_CURSORS: boolean;
  DOCUMENT_VERSIONING: boolean;
  
  // UI features
  MODERN_EDITOR: boolean;
  DARK_MODE: boolean;
  MARKDOWN_PREVIEW: boolean;
  
  // Backend features
  RATE_LIMITING: boolean;
  ANALYTICS: boolean;
  WEBHOOKS: boolean;
  
  // Experimental features
  AI_SUGGESTIONS: boolean;
  PLUGIN_MARKETPLACE: boolean;
  VOICE_NOTES: boolean;
}

// Default feature flag values
const defaultFlags: FeatureFlags = {
  // Core features - stable
  COLLABORATIVE_EDITING: true,
  REAL_TIME_CURSORS: false, // Disabled until HocusPocus is stable
  DOCUMENT_VERSIONING: true,
  
  // UI features - stable
  MODERN_EDITOR: true,
  DARK_MODE: true,
  MARKDOWN_PREVIEW: true,
  
  // Backend features - configurable
  RATE_LIMITING: true,
  ANALYTICS: false,
  WEBHOOKS: false,
  
  // Experimental features - disabled by default
  AI_SUGGESTIONS: false,
  PLUGIN_MARKETPLACE: false,
  VOICE_NOTES: false,
};

// Environment-specific overrides
const environmentOverrides: Partial<Record<string, Partial<FeatureFlags>>> = {
  development: {
    AI_SUGGESTIONS: true,
    ANALYTICS: true,
  },
  staging: {
    WEBHOOKS: true,
    ANALYTICS: true,
  },
  production: {
    REAL_TIME_CURSORS: true,
  }
};

// User-based feature flags (percentage rollout)
const userRollouts: Record<string, number> = {
  AI_SUGGESTIONS: 10, // 10% of users
  PLUGIN_MARKETPLACE: 5, // 5% of users
  VOICE_NOTES: 1, // 1% of users
};

class FeatureFlagManager {
  private flags: FeatureFlags;
  private redisClient: any;
  
  constructor(redisClient?: any) {
    this.redisClient = redisClient;
    this.flags = this.loadFlags();
  }
  
  private loadFlags(): FeatureFlags {
    const flags = { ...defaultFlags };
    const env = process.env.NODE_ENV || 'development';
    
    // Apply environment overrides
    if (environmentOverrides[env]) {
      Object.assign(flags, environmentOverrides[env]);
    }
    
    // Apply environment variable overrides
    Object.keys(flags).forEach(key => {
      const envVar = `FEATURE_${key}`;
      if (process.env[envVar] !== undefined) {
        (flags as any)[key] = process.env[envVar] === 'true';
      }
    });
    
    return flags;
  }
  
  // Check if feature is enabled
  isEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature];
  }
  
  // Check if feature is enabled for specific user
  isEnabledForUser(feature: keyof FeatureFlags, userId: string): boolean {
    // First check if feature is globally enabled
    if (!this.flags[feature]) {
      return false;
    }
    
    // Check if user-specific rollout applies
    const rolloutPercentage = userRollouts[feature];
    if (rolloutPercentage !== undefined) {
      const userHash = this.hashUserId(userId);
      return (userHash % 100) < rolloutPercentage;
    }
    
    return true;
  }
  
  // Hash user ID for consistent rollout
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  // Update feature flag at runtime (for emergency toggles)
  async updateFlag(feature: keyof FeatureFlags, enabled: boolean): Promise<void> {
    this.flags[feature] = enabled;
    
    // Persist to Redis for cross-instance consistency
    if (this.redisClient) {
      try {
        await this.redisClient.hSet('feature-flags', feature, enabled.toString());
        console.log(`Feature flag updated: ${feature} = ${enabled}`);
      } catch (error) {
        console.error('Failed to persist feature flag to Redis:', error);
      }
    }
  }
  
  // Get all current flags
  getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }
  
  // Get flags for specific user
  getFlagsForUser(userId: string): FeatureFlags {
    const userFlags = { ...this.flags };
    
    Object.keys(userFlags).forEach(key => {
      const feature = key as keyof FeatureFlags;
      userFlags[feature] = this.isEnabledForUser(feature, userId);
    });
    
    return userFlags;
  }
  
  // Middleware for Express to add feature flags to request
  middleware() {
    return (req: any, res: any, next: any) => {
      const userId = req.user?.id || req.headers['x-user-id'] || 'anonymous';
      req.featureFlags = this.getFlagsForUser(userId);
      next();
    };
  }
}

// Singleton instance
let featureFlagManager: FeatureFlagManager;

export function getFeatureFlags(redisClient?: any): FeatureFlagManager {
  if (!featureFlagManager) {
    featureFlagManager = new FeatureFlagManager(redisClient);
  }
  return featureFlagManager;
}

export { FeatureFlags, FeatureFlagManager };