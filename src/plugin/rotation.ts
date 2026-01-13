/**
 * Account Rotation System
 * 
 * Implements advanced account selection algorithms:
 * - Health Score: Track account wellness based on success/failure
 * - LRU Selection: Prefer accounts with longest rest periods
 * - Jitter: Add random variance to break predictable patterns
 * 
 * Used by 'hybrid' strategy for improved ban prevention and load distribution.
 */

// ============================================================================
// HEALTH SCORE SYSTEM
// ============================================================================

export interface HealthScoreConfig {
  /** Initial score for new accounts (default: 70) */
  initial: number;
  /** Points added on successful request (default: 1) */
  successReward: number;
  /** Points removed on rate limit (default: -10) */
  rateLimitPenalty: number;
  /** Points removed on failure (auth, network, etc.) (default: -20) */
  failurePenalty: number;
  /** Points recovered per hour of rest (default: 2) */
  recoveryRatePerHour: number;
  /** Minimum score to be considered usable (default: 50) */
  minUsable: number;
  /** Maximum score cap (default: 100) */
  maxScore: number;
}

export const DEFAULT_HEALTH_SCORE_CONFIG: HealthScoreConfig = {
  initial: 70,
  successReward: 1,
  rateLimitPenalty: -10,
  failurePenalty: -20,
  recoveryRatePerHour: 2,
  minUsable: 50,
  maxScore: 100,
};

interface HealthScoreState {
  score: number;
  lastUpdated: number;
  lastSuccess: number;
  consecutiveFailures: number;
}

/**
 * Tracks health scores for accounts.
 * Higher score = healthier account = preferred for selection.
 */
export class HealthScoreTracker {
  private readonly scores = new Map<number, HealthScoreState>();
  private readonly config: HealthScoreConfig;

  constructor(config: Partial<HealthScoreConfig> = {}) {
    this.config = { ...DEFAULT_HEALTH_SCORE_CONFIG, ...config };
  }

  /**
   * Get current health score for an account, applying time-based recovery.
   */
  getScore(accountIndex: number): number {
    const state = this.scores.get(accountIndex);
    if (!state) {
      return this.config.initial;
    }

    // Apply passive recovery based on time since last update
    const now = Date.now();
    const hoursSinceUpdate = (now - state.lastUpdated) / (1000 * 60 * 60);
    const recoveredPoints = Math.floor(hoursSinceUpdate * this.config.recoveryRatePerHour);
    
    return Math.min(
      this.config.maxScore,
      state.score + recoveredPoints
    );
  }

  /**
   * Record a successful request - improves health score.
   */
  recordSuccess(accountIndex: number): void {
    const now = Date.now();
    const current = this.getScore(accountIndex);
    
    this.scores.set(accountIndex, {
      score: Math.min(this.config.maxScore, current + this.config.successReward),
      lastUpdated: now,
      lastSuccess: now,
      consecutiveFailures: 0,
    });
  }

  /**
   * Record a rate limit hit - moderate penalty.
   */
  recordRateLimit(accountIndex: number): void {
    const now = Date.now();
    const state = this.scores.get(accountIndex);
    const current = this.getScore(accountIndex);
    
    this.scores.set(accountIndex, {
      score: Math.max(0, current + this.config.rateLimitPenalty),
      lastUpdated: now,
      lastSuccess: state?.lastSuccess ?? 0,
      consecutiveFailures: (state?.consecutiveFailures ?? 0) + 1,
    });
  }

  /**
   * Record a failure (auth, network, etc.) - larger penalty.
   */
  recordFailure(accountIndex: number): void {
    const now = Date.now();
    const state = this.scores.get(accountIndex);
    const current = this.getScore(accountIndex);
    
    this.scores.set(accountIndex, {
      score: Math.max(0, current + this.config.failurePenalty),
      lastUpdated: now,
      lastSuccess: state?.lastSuccess ?? 0,
      consecutiveFailures: (state?.consecutiveFailures ?? 0) + 1,
    });
  }

  /**
   * Check if account is healthy enough to use.
   */
  isUsable(accountIndex: number): boolean {
    return this.getScore(accountIndex) >= this.config.minUsable;
  }

  /**
   * Get consecutive failure count for an account.
   */
  getConsecutiveFailures(accountIndex: number): number {
    return this.scores.get(accountIndex)?.consecutiveFailures ?? 0;
  }

  /**
   * Reset health state for an account (e.g., after removal).
   */
  reset(accountIndex: number): void {
    this.scores.delete(accountIndex);
  }

  /**
   * Get all scores for debugging/logging.
   */
  getSnapshot(): Map<number, { score: number; consecutiveFailures: number }> {
    const result = new Map<number, { score: number; consecutiveFailures: number }>();
    for (const [index] of this.scores) {
      result.set(index, {
        score: this.getScore(index),
        consecutiveFailures: this.getConsecutiveFailures(index),
      });
    }
    return result;
  }
}

// ============================================================================
// JITTER UTILITIES
// ============================================================================

/**
 * Add random jitter to a delay value.
 * Helps break predictable timing patterns.
 * 
 * @param baseMs - Base delay in milliseconds
 * @param jitterFactor - Fraction of base to vary (default: 0.3 = ±30%)
 * @returns Jittered delay in milliseconds
 */
export function addJitter(baseMs: number, jitterFactor: number = 0.3): number {
  const jitterRange = baseMs * jitterFactor;
  const jitter = (Math.random() * 2 - 1) * jitterRange; // -jitterRange to +jitterRange
  return Math.max(0, Math.round(baseMs + jitter));
}

/**
 * Generate a random delay within a range.
 * 
 * @param minMs - Minimum delay in milliseconds
 * @param maxMs - Maximum delay in milliseconds
 * @returns Random delay between min and max
 */
export function randomDelay(minMs: number, maxMs: number): number {
  return Math.round(minMs + Math.random() * (maxMs - minMs));
}

// ============================================================================
// LRU SELECTION
// ============================================================================

export interface AccountWithMetrics {
  index: number;
  lastUsed: number;
  healthScore: number;
  isRateLimited: boolean;
  isCoolingDown: boolean;
}

/**
 * Sort accounts by LRU (least recently used first) with health score tiebreaker.
 * 
 * Priority:
 * 1. Filter out rate-limited and cooling-down accounts
 * 2. Filter out unhealthy accounts (score < minUsable)
 * 3. Sort by lastUsed ascending (oldest first = most rested)
 * 4. Tiebreaker: higher health score wins
 */
export function sortByLruWithHealth(
  accounts: AccountWithMetrics[],
  minHealthScore: number = 50,
): AccountWithMetrics[] {
  return accounts
    .filter(acc => !acc.isRateLimited && !acc.isCoolingDown && acc.healthScore >= minHealthScore)
    .sort((a, b) => {
      // Primary: LRU (oldest lastUsed first)
      const lruDiff = a.lastUsed - b.lastUsed;
      if (lruDiff !== 0) return lruDiff;
      
      // Tiebreaker: higher health score wins
      return b.healthScore - a.healthScore;
    });
}

/**
 * Select account using hybrid strategy:
 * 1. Filter available accounts (not rate-limited, not cooling down, healthy)
 * 2. Sort by LRU with health score tiebreaker
 * 3. Return the best candidate (most rested + healthiest)
 * 
 * @param accounts - All accounts with their metrics
 * @param minHealthScore - Minimum health score to be considered
 * @returns Best account index, or null if none available
 */
export function selectHybridAccount(
  accounts: AccountWithMetrics[],
  minHealthScore: number = 50,
): number | null {
  const sorted = sortByLruWithHealth(accounts, minHealthScore);
  
  if (sorted.length === 0) {
    return null;
  }

  // Return the best candidate (first in sorted list)
  return sorted[0]?.index ?? null;
}

// ============================================================================
// TOKEN BUCKET SYSTEM
// ============================================================================

export interface TokenBucketConfig {
  /** Maximum tokens per account (default: 50) */
  maxTokens: number;
  /** Tokens regenerated per minute (default: 6) */
  regenerationRatePerMinute: number;
  /** Initial tokens for new accounts (default: 50) */
  initialTokens: number;
}

export const DEFAULT_TOKEN_BUCKET_CONFIG: TokenBucketConfig = {
  maxTokens: 50,
  regenerationRatePerMinute: 6,
  initialTokens: 50,
};

interface TokenBucketState {
  tokens: number;
  lastUpdated: number;
}

/**
 * Client-side rate limiting using Token Bucket algorithm.
 * Helps prevent hitting server 429s by tracking "cost" of requests.
 */
export class TokenBucketTracker {
  private readonly buckets = new Map<number, TokenBucketState>();
  private readonly config: TokenBucketConfig;

  constructor(config: Partial<TokenBucketConfig> = {}) {
    this.config = { ...DEFAULT_TOKEN_BUCKET_CONFIG, ...config };
  }

  /**
   * Get current token balance for an account, applying regeneration.
   */
  getTokens(accountIndex: number): number {
    const state = this.buckets.get(accountIndex);
    if (!state) {
      return this.config.initialTokens;
    }

    const now = Date.now();
    const minutesSinceUpdate = (now - state.lastUpdated) / (1000 * 60);
    const recoveredTokens = minutesSinceUpdate * this.config.regenerationRatePerMinute;
    
    return Math.min(
      this.config.maxTokens,
      state.tokens + recoveredTokens
    );
  }

  /**
   * Check if account has enough tokens for a request.
   * @param cost Cost of the request (default: 1)
   */
  hasTokens(accountIndex: number, cost: number = 1): boolean {
    return this.getTokens(accountIndex) >= cost;
  }

  /**
   * Consume tokens for a request.
   * @returns true if tokens were consumed, false if insufficient
   */
  consume(accountIndex: number, cost: number = 1): boolean {
    const current = this.getTokens(accountIndex);
    if (current < cost) {
      return false;
    }

    this.buckets.set(accountIndex, {
      tokens: current - cost,
      lastUpdated: Date.now(),
    });
    return true;
  }

  /**
   * Refund tokens (e.g., if request wasn't actually sent).
   */
  refund(accountIndex: number, amount: number = 1): void {
    const current = this.getTokens(accountIndex);
    this.buckets.set(accountIndex, {
      tokens: Math.min(this.config.maxTokens, current + amount),
      lastUpdated: Date.now(),
    });
  }
}

// ============================================================================
// WEIGHTED RANDOM SELECTION
// ============================================================================

export interface WeightedAccountCandidate extends AccountWithMetrics {
  tokens: number;
}

/**
 * Calculate priority score for an account.
 * Higher is better.
 * 
 * Formula: (HealthScore * 2) + (Tokens * 5) - (SecondsSinceUsed * 0.1)
 * Note: We prefer RECENTLY used accounts slightly less (LRU-ish), but prioritize
 * health and token availability much more heavily.
 */
function calculatePriorityScore(
  account: WeightedAccountCandidate,
  maxTokens: number
): number {
  const healthComponent = account.healthScore * 2; // 0-200
  const tokenComponent = (account.tokens / maxTokens) * 100 * 5; // 0-500
  
  // LRU Component: Small penalty for very recently used accounts to encourage spreading
  // but much smaller than LRU strategy.
  const secondsSinceUsed = (Date.now() - account.lastUsed) / 1000;
  // Cap the "freshness" bonus at 1 hour
  const freshnessComponent = Math.min(secondsSinceUsed, 3600) * 0.1;

  return healthComponent + tokenComponent + freshnessComponent;
}

/**
 * Select account using Weighted Random strategy (Priority Queue):
 * 
 * 1. Filter usable accounts (healthy, tokens available)
 * 2. Calculate priority score for each
 * 3. Sort by score descending
 * 4. Take top 30% candidates
 * 5. Weighted random selection from top candidates
 * 
 * @param accounts - Candidates with metrics
 * @param tokenTracker - Tracker for token balances
 * @param minHealthScore - Minimum health score
 * @returns Selected account index or null
 */
export function selectPriorityQueueAccount(
  accounts: AccountWithMetrics[],
  tokenTracker: TokenBucketTracker,
  minHealthScore: number = 50
): number | null {
  // 1. Filter and attach tokens
  const candidates: WeightedAccountCandidate[] = accounts
    .filter(acc => 
      !acc.isRateLimited && 
      !acc.isCoolingDown && 
      acc.healthScore >= minHealthScore &&
      tokenTracker.hasTokens(acc.index)
    )
    .map(acc => ({
      ...acc,
      tokens: tokenTracker.getTokens(acc.index)
    }));

  if (candidates.length === 0) {
    return null;
  }

  // 2. Calculate scores
  const scored = candidates.map(acc => ({
    acc,
    score: calculatePriorityScore(acc, 50)
  })).sort((a, b) => b.score - a.score);

  // 3. Top 30% (min 1, max 5)
  const topCount = Math.min(5, Math.max(1, Math.ceil(scored.length * 0.3)));
  const topCandidates = scored.slice(0, topCount);

  // 4. Weighted Random Selection
  // Weights: #1=40%, #2=30%, #3=20%, etc roughly
  // Simple approach: score is the weight
  const totalScore = topCandidates.reduce((sum, item) => sum + item.score, 0);
  let randomValue = Math.random() * totalScore;
  
  for (const item of topCandidates) {
    randomValue -= item.score;
    if (randomValue <= 0) {
      return item.acc.index;
    }
  }

  // Fallback to top score
  return topCandidates[0]?.acc.index ?? candidates[0]?.index ?? 0;
}

// ============================================================================
// SINGLETON TRACKERS
// ============================================================================

let globalTokenTracker: TokenBucketTracker | null = null;

export function getTokenTracker(config?: Partial<TokenBucketConfig>): TokenBucketTracker {
  if (!globalTokenTracker) {
    globalTokenTracker = new TokenBucketTracker(config);
  }
  return globalTokenTracker;
}

export function initTokenTracker(config: Partial<TokenBucketConfig>): TokenBucketTracker {
  globalTokenTracker = new TokenBucketTracker(config);
  return globalTokenTracker;
}

let globalHealthTracker: HealthScoreTracker | null = null;

/**
 * Get the global health score tracker instance.
 * Creates one with default config if not initialized.
 */
export function getHealthTracker(config?: Partial<HealthScoreConfig>): HealthScoreTracker {
  if (!globalHealthTracker) {
    globalHealthTracker = new HealthScoreTracker(config);
  }
  return globalHealthTracker;
}

/**
 * Initialize the global health tracker with custom config.
 * Call this at plugin startup if custom config is needed.
 */
export function initHealthTracker(config: Partial<HealthScoreConfig>): HealthScoreTracker {
  globalHealthTracker = new HealthScoreTracker(config);
  return globalHealthTracker;
}
