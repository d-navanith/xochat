import { LockState } from '../types';

export class LockManager {
  private locks: Map<string, LockState> = new Map();
  private readonly DEFAULT_TTL_MS = 30000; // 30 seconds auto-expiry

  /**
   * Atomically attempts to acquire or renew a lock on a conversation.
   */
  public acquireLock(
    conversationId: string,
    agentId: string,
    agentUsername: string,
    agentName: string,
    agentAvatar: string
  ): { success: boolean; lock: LockState; message: string } {
    const now = Date.now();
    const existing = this.locks.get(conversationId);

    // If active lock exists and has not expired
    if (existing && existing.expiresAt > now) {
      if (existing.agentId === agentId) {
        // Same agent renewing their lock
        existing.expiresAt = now + this.DEFAULT_TTL_MS;
        return { success: true, lock: existing, message: 'Lock renewed' };
      }
      // Held by another agent!
      return {
        success: false,
        lock: existing,
        message: `Chat is currently locked by @${existing.agentUsername} (${existing.agentName})`,
      };
    }

    // Either no lock or expired: acquire cleanly
    const newLock: LockState = {
      conversationId,
      agentId,
      agentUsername,
      agentName,
      agentAvatar,
      acquiredAt: now,
      expiresAt: now + this.DEFAULT_TTL_MS,
    };

    this.locks.set(conversationId, newLock);
    return { success: true, lock: newLock, message: 'Lock acquired' };
  }

  /**
   * Release lock when agent finishes replying or cancels
   */
  public releaseLock(conversationId: string, agentId: string, force = false): boolean {
    const existing = this.locks.get(conversationId);
    if (!existing) return true;

    if (force || existing.agentId === agentId) {
      this.locks.delete(conversationId);
      return true;
    }

    return false;
  }

  /**
   * Release all locks held by a specific agent (e.g., when socket disconnects)
   */
  public releaseAllByAgent(agentId: string): string[] {
    const releasedIds: string[] = [];
    for (const [convId, lock] of this.locks.entries()) {
      if (lock.agentId === agentId) {
        this.locks.delete(convId);
        releasedIds.push(convId);
      }
    }
    return releasedIds;
  }

  public getLock(conversationId: string): LockState | null {
    const now = Date.now();
    const existing = this.locks.get(conversationId);
    if (!existing) return null;
    if (existing.expiresAt <= now) {
      this.locks.delete(conversationId);
      return null;
    }
    return existing;
  }

  public getAllActiveLocks(): Record<string, LockState> {
    const now = Date.now();
    const active: Record<string, LockState> = {};
    for (const [convId, lock] of this.locks.entries()) {
      if (lock.expiresAt > now) {
        active[convId] = lock;
      } else {
        this.locks.delete(convId);
      }
    }
    return active;
  }

  /**
   * Periodic reaper to evict expired locks
   */
  public purgeExpired(): string[] {
    const now = Date.now();
    const expired: string[] = [];
    for (const [convId, lock] of this.locks.entries()) {
      if (lock.expiresAt <= now) {
        expired.push(convId);
        this.locks.delete(convId);
      }
    }
    return expired;
  }
}

export const lockManager = new LockManager();
