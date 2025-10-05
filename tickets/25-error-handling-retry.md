# Ticket 3.4: Error Handling & Retry Logic

## 📋 Ticket Details
**Phase**: 3 - Advanced Features  
**Story Points**: 5  
**Priority**: High  
**Assignee**: TBD  
**Status**: Ready

## 🔗 Dependencies
**Depends on**: Phase 2 Complete  
**Blocking**: None  

## 🎯 Description
Implement sophisticated error handling with retry mechanisms for the analytics system. This includes exponential backoff, error isolation per destination, circuit breaker patterns, and comprehensive error recovery strategies.

## 🧠 Context & Background
Robust error handling is critical for analytics system reliability:
- **Exponential backoff** - Prevents overwhelming failed services
- **Error isolation** - Failed destinations don't affect others
- **Circuit breaker pattern** - Temporarily stops calling failing services
- **Retry strategies** - Different retry logic for different error types
- **Error recovery** - Automatic recovery from transient failures
- **Dead letter queue** - Store permanently failed events for analysis

The error handling system must:
- Handle network errors, API errors, and validation errors differently
- Implement exponential backoff with jitter
- Use circuit breaker pattern for failing destinations
- Provide detailed error logging and monitoring
- Support manual retry and automatic recovery
- Maintain error statistics and metrics

## ✅ Acceptance Criteria
- [ ] Create `ErrorHandler` class with retry strategies
- [ ] Implement exponential backoff with jitter
- [ ] Add circuit breaker pattern for destinations
- [ ] Add error isolation per destination
- [ ] Add dead letter queue for failed events
- [ ] Add error recovery mechanisms
- [ ] Unit tests for error handling
- [ ] Integration tests with retry logic

## 📁 Files to Update
- `packages/backend/src/v2/handlers/analytics/` (add error handling)

## 🔧 Implementation Details

### Error Handler Implementation
```typescript
import { AnalyticsEvent, AnalyticsConsent, EventContext } from './types';
import { Logger } from './logger';

export enum ErrorType {
  NETWORK_ERROR = 'network_error',
  API_ERROR = 'api_error',
  VALIDATION_ERROR = 'validation_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  TIMEOUT_ERROR = 'timeout_error',
  UNKNOWN_ERROR = 'unknown_error',
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
  backoffMultiplier: number;
}

export interface ErrorContext {
  event: AnalyticsEvent;
  destination: string;
  attempt: number;
  error: Error;
  timestamp: number;
  context?: EventContext;
}

export interface RetryResult {
  success: boolean;
  attempts: number;
  totalDuration: number;
  finalError?: Error;
}

export class ErrorHandler {
  private retryConfigs = new Map<ErrorType, RetryConfig>();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private deadLetterQueue: DeadLetterQueue;
  private errorStats = new Map<string, ErrorStats>();

  constructor(
    private logger: Logger,
    deadLetterConfig?: Partial<DeadLetterConfig>
  ) {
    this.deadLetterQueue = new DeadLetterQueue(deadLetterConfig);
    this.setupDefaultRetryConfigs();
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const errorType = this.classifyError(context.error);
    const retryConfig = this.getRetryConfig(errorType, customConfig);
    const circuitBreaker = this.getCircuitBreaker(context.destination);

    // Check circuit breaker
    if (!circuitBreaker.canExecute()) {
      throw new Error(`Circuit breaker open for destination: ${context.destination}`);
    }

    let lastError: Error = context.error;
    let attempts = 0;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      attempts = attempt + 1;

      try {
        // Record attempt
        circuitBreaker.recordAttempt();
        
        const result = await operation();
        
        // Record success
        circuitBreaker.recordSuccess();
        this.recordSuccess(context.destination, attempts, Date.now() - startTime);
        
        this.logger.debug('Operation succeeded', {
          destination: context.destination,
          attempts,
          duration: Date.now() - startTime,
        });

        return result;

      } catch (error) {
        lastError = error;
        const errorType = this.classifyError(error);
        
        // Record failure
        circuitBreaker.recordFailure();
        this.recordError(context.destination, errorType, error);

        // Check if we should retry
        if (attempt >= retryConfig.maxRetries || !this.shouldRetry(errorType, error)) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, retryConfig);
        
        this.logger.warn('Operation failed, retrying', {
          destination: context.destination,
          attempt: attempts,
          error: error.message,
          errorType,
          delayMs: delay,
          maxRetries: retryConfig.maxRetries,
        });

        // Wait before retry
        await this.delay(delay);
      }
    }

    // All retries exhausted
    const result: RetryResult = {
      success: false,
      attempts,
      totalDuration: Date.now() - startTime,
      finalError: lastError,
    };

    // Send to dead letter queue
    await this.deadLetterQueue.add({
      ...context,
      error: lastError,
      attempts,
      totalDuration: result.totalDuration,
    });

    this.logger.error('Operation failed after all retries', {
      destination: context.destination,
      attempts,
      totalDuration: result.totalDuration,
      error: lastError.message,
    });

    throw lastError;
  }

  /**
   * Classify error type for appropriate retry strategy
   */
  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK_ERROR;
    }
    
    if (message.includes('timeout')) {
      return ErrorType.TIMEOUT_ERROR;
    }
    
    if (message.includes('rate limit') || message.includes('429')) {
      return ErrorType.RATE_LIMIT_ERROR;
    }
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return ErrorType.AUTHENTICATION_ERROR;
    }
    
    if (message.includes('validation') || message.includes('400')) {
      return ErrorType.VALIDATION_ERROR;
    }
    
    if (message.includes('api') || message.includes('500')) {
      return ErrorType.API_ERROR;
    }
    
    return ErrorType.UNKNOWN_ERROR;
  }

  /**
   * Get retry configuration for error type
   */
  private getRetryConfig(errorType: ErrorType, customConfig?: Partial<RetryConfig>): RetryConfig {
    const baseConfig = this.retryConfigs.get(errorType) || this.getDefaultRetryConfig();
    
    return {
      ...baseConfig,
      ...customConfig,
    };
  }

  /**
   * Check if error should be retried
   */
  private shouldRetry(errorType: ErrorType, error: Error): boolean {
    // Don't retry validation errors
    if (errorType === ErrorType.VALIDATION_ERROR) {
      return false;
    }
    
    // Don't retry authentication errors
    if (errorType === ErrorType.AUTHENTICATION_ERROR) {
      return false;
    }
    
    // Retry network, timeout, and API errors
    return [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.API_ERROR,
      ErrorType.RATE_LIMIT_ERROR,
    ].includes(errorType);
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
    
    // Cap at max delay
    delay = Math.min(delay, config.maxDelayMs);
    
    // Add jitter to prevent thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  /**
   * Get or create circuit breaker for destination
   */
  private getCircuitBreaker(destination: string): CircuitBreaker {
    if (!this.circuitBreakers.has(destination)) {
      this.circuitBreakers.set(destination, new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 30000,
        monitoringPeriod: 60000,
      }));
    }
    
    return this.circuitBreakers.get(destination)!;
  }

  /**
   * Record successful operation
   */
  private recordSuccess(destination: string, attempts: number, duration: number): void {
    const stats = this.getErrorStats(destination);
    stats.successfulOperations++;
    stats.totalAttempts += attempts;
    stats.totalDuration += duration;
    stats.lastSuccess = Date.now();
  }

  /**
   * Record error occurrence
   */
  private recordError(destination: string, errorType: ErrorType, error: Error): void {
    const stats = this.getErrorStats(destination);
    stats.failedOperations++;
    stats.errorCounts.set(errorType, (stats.errorCounts.get(errorType) || 0) + 1);
    stats.lastError = Date.now();
    stats.lastErrorMessage = error.message;
  }

  /**
   * Get error statistics for destination
   */
  private getErrorStats(destination: string): ErrorStats {
    if (!this.errorStats.has(destination)) {
      this.errorStats.set(destination, {
        destination,
        successfulOperations: 0,
        failedOperations: 0,
        totalAttempts: 0,
        totalDuration: 0,
        errorCounts: new Map(),
        lastSuccess: 0,
        lastError: 0,
        lastErrorMessage: '',
      });
    }
    
    return this.errorStats.get(destination)!;
  }

  /**
   * Setup default retry configurations
   */
  private setupDefaultRetryConfigs(): void {
    this.retryConfigs.set(ErrorType.NETWORK_ERROR, {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      jitter: true,
      backoffMultiplier: 2,
    });

    this.retryConfigs.set(ErrorType.API_ERROR, {
      maxRetries: 2,
      baseDelayMs: 2000,
      maxDelayMs: 15000,
      jitter: true,
      backoffMultiplier: 2,
    });

    this.retryConfigs.set(ErrorType.RATE_LIMIT_ERROR, {
      maxRetries: 3,
      baseDelayMs: 5000,
      maxDelayMs: 30000,
      jitter: true,
      backoffMultiplier: 2,
    });

    this.retryConfigs.set(ErrorType.TIMEOUT_ERROR, {
      maxRetries: 2,
      baseDelayMs: 1000,
      maxDelayMs: 5000,
      jitter: true,
      backoffMultiplier: 1.5,
    });
  }

  private getDefaultRetryConfig(): RetryConfig {
    return {
      maxRetries: 2,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      jitter: true,
      backoffMultiplier: 2,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error statistics for all destinations
   */
  getErrorStats(): Map<string, ErrorStats> {
    return new Map(this.errorStats);
  }

  /**
   * Get circuit breaker status for destination
   */
  getCircuitBreakerStatus(destination: string): CircuitBreakerStatus | null {
    const breaker = this.circuitBreakers.get(destination);
    return breaker ? breaker.getStatus() : null;
  }

  /**
   * Get dead letter queue statistics
   */
  getDeadLetterQueueStats(): DeadLetterQueueStats {
    return this.deadLetterQueue.getStats();
  }

  /**
   * Retry failed events from dead letter queue
   */
  async retryDeadLetterEvents(destination?: string): Promise<RetryResult[]> {
    return this.deadLetterQueue.retry(destination);
  }

  /**
   * Clear error statistics
   */
  clearStats(): void {
    this.errorStats.clear();
    this.circuitBreakers.clear();
    this.deadLetterQueue.clear();
  }
}

interface ErrorStats {
  destination: string;
  successfulOperations: number;
  failedOperations: number;
  totalAttempts: number;
  totalDuration: number;
  errorCounts: Map<ErrorType, number>;
  lastSuccess: number;
  lastError: number;
  lastErrorMessage: string;
}
```

### Circuit Breaker Implementation
```typescript
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

export interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
  successCount: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private nextAttemptTime?: number;
  private monitoringStartTime = Date.now();

  constructor(private config: CircuitBreakerConfig) {}

  canExecute(): boolean {
    if (this.state === CircuitBreakerState.CLOSED) {
      return true;
    }

    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() >= (this.nextAttemptTime || 0)) {
        this.state = CircuitBreakerState.HALF_OPEN;
        return true;
      }
      return false;
    }

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      return true;
    }

    return false;
  }

  recordAttempt(): void {
    // Reset monitoring period if needed
    if (Date.now() - this.monitoringStartTime > this.config.monitoringPeriod) {
      this.reset();
    }
  }

  recordSuccess(): void {
    this.successCount++;
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // If we get enough successes in half-open state, close the circuit
      if (this.successCount >= 3) {
        this.state = CircuitBreakerState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttemptTime = undefined;
      }
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in half-open state opens the circuit
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    } else if (this.failureCount >= this.config.failureThreshold) {
      // Too many failures, open the circuit
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    }
  }

  getStatus(): CircuitBreakerStatus {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      successCount: this.successCount,
    };
  }

  private reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    this.monitoringStartTime = Date.now();
  }
}
```

### Dead Letter Queue Implementation
```typescript
export interface DeadLetterEvent {
  id: string;
  event: AnalyticsEvent;
  destination: string;
  error: Error;
  attempts: number;
  totalDuration: number;
  timestamp: number;
  context?: EventContext;
}

export interface DeadLetterConfig {
  maxSize: number;
  ttlMs: number;
  storageKey: string;
}

export interface DeadLetterQueueStats {
  size: number;
  oldestEvent?: number;
  newestEvent?: number;
  destinations: Map<string, number>;
}

export class DeadLetterQueue {
  private events: DeadLetterEvent[] = [];
  private config: DeadLetterConfig;

  constructor(config: Partial<DeadLetterConfig> = {}) {
    this.config = {
      maxSize: 1000,
      ttlMs: 24 * 60 * 60 * 1000, // 24 hours
      storageKey: 'c15t-dead-letter-queue',
      ...config,
    };

    this.loadFromStorage();
    this.startCleanupTimer();
  }

  async add(event: DeadLetterEvent): Promise<void> {
    // Remove oldest events if queue is full
    if (this.events.length >= this.config.maxSize) {
      this.events.shift();
    }

    this.events.push({
      ...event,
      id: event.id || this.generateId(),
      timestamp: Date.now(),
    });

    await this.persistToStorage();
  }

  async retry(destination?: string): Promise<RetryResult[]> {
    const eventsToRetry = destination 
      ? this.events.filter(event => event.destination === destination)
      : this.events;

    const results: RetryResult[] = [];

    for (const event of eventsToRetry) {
      try {
        // Remove from dead letter queue
        this.removeEvent(event.id);
        
        // Retry the event (implementation would depend on how to retry)
        const result = await this.retryEvent(event);
        results.push(result);
        
      } catch (error) {
        results.push({
          success: false,
          attempts: 1,
          totalDuration: 0,
          finalError: error,
        });
      }
    }

    await this.persistToStorage();
    return results;
  }

  private async retryEvent(event: DeadLetterEvent): Promise<RetryResult> {
    // Implementation would retry the event
    // This would involve calling the destination again
    return {
      success: true,
      attempts: 1,
      totalDuration: 0,
    };
  }

  removeEvent(id: string): void {
    this.events = this.events.filter(event => event.id !== id);
  }

  getStats(): DeadLetterQueueStats {
    const destinations = new Map<string, number>();
    
    this.events.forEach(event => {
      const count = destinations.get(event.destination) || 0;
      destinations.set(event.destination, count + 1);
    });

    return {
      size: this.events.length,
      oldestEvent: this.events[0]?.timestamp,
      newestEvent: this.events[this.events.length - 1]?.timestamp,
      destinations,
    };
  }

  clear(): void {
    this.events = [];
    this.persistToStorage();
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        this.events = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load dead letter queue from storage', error);
    }
  }

  private async persistToStorage(): Promise<void> {
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.events));
    } catch (error) {
      console.warn('Failed to persist dead letter queue to storage', error);
    }
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      const cutoff = Date.now() - this.config.ttlMs;
      this.events = this.events.filter(event => event.timestamp > cutoff);
      this.persistToStorage();
    }, this.config.ttlMs);
  }

  private generateId(): string {
    return `dlq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## 🧪 Testing Requirements
- Unit tests for error classification
- Unit tests for retry logic with exponential backoff
- Unit tests for circuit breaker pattern
- Unit tests for dead letter queue
- Unit tests for error statistics
- Integration tests with destination system
- Performance tests for error handling overhead

## 🔍 Definition of Done
- [ ] ErrorHandler class with retry strategies implemented
- [ ] Exponential backoff with jitter implemented
- [ ] Circuit breaker pattern for destinations implemented
- [ ] Error isolation per destination implemented
- [ ] Dead letter queue for failed events implemented
- [ ] Error recovery mechanisms implemented
- [ ] Unit tests for error handling
- [ ] Integration tests with retry logic
- [ ] Code review completed

## 📚 Related Documentation
- [Analytics Architecture Diagram](../docs/analytics-architecture-diagram.md)
- [Analytics Frontend Integration](../docs/analytics-frontend-integration.md)

## 🔗 Dependencies
- [5.3: Lazy Loading](./24-lazy-loading.md) ✅

## 🚀 Next Ticket
[5.5: Implement Dynamic Script Loading Hook](./26-dynamic-script-loading.md)
