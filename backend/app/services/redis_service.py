import redis
from typing import Optional
from app.core.config import settings

# Redis client instance
_redis_client: Optional[redis.Redis] = None


def get_redis_client() -> redis.Redis:
    """Get Redis client instance (singleton)."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True
        )
    return _redis_client


class RedisService:
    """Service for Redis operations."""

    def __init__(self):
        self.client = get_redis_client()

    def set_with_expiry(self, key: str, value: str, expire_seconds: int) -> bool:
        """Set a key with expiration."""
        return self.client.setex(key, expire_seconds, value)

    def get(self, key: str) -> Optional[str]:
        """Get a value by key."""
        return self.client.get(key)

    def delete(self, key: str) -> bool:
        """Delete a key."""
        return self.client.delete(key) > 0

    def exists(self, key: str) -> bool:
        """Check if key exists."""
        return self.client.exists(key) > 0

    def increment(self, key: str) -> int:
        """Increment a counter."""
        return self.client.incr(key)

    def expire(self, key: str, seconds: int) -> bool:
        """Set expiration on existing key."""
        return self.client.expire(key, seconds)

    def get_ttl(self, key: str) -> int:
        """Get time to live for a key."""
        return self.client.ttl(key)

    # Task Queue Methods
    def add_task(self, stream_name: str, task_data: dict) -> str:
        """Add a task to a Redis stream."""
        return self.client.xadd(stream_name, task_data)

    def get_task_status(self, task_id: str) -> Optional[dict]:
        """Get task status from Redis."""
        status = self.client.hgetall(f"task:{task_id}")
        return status if status else None

    def set_task_status(self, task_id: str, status: dict, expire_seconds: int = 86400) -> None:
        """Set task status in Redis."""
        self.client.hset(f"task:{task_id}", mapping=status)
        self.client.expire(f"task:{task_id}", expire_seconds)

    # Rate Limiting Helper
    def check_rate_limit(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
        """
        Check if rate limit is exceeded.
        Returns (is_allowed, remaining_requests).
        """
        current = self.client.get(key)

        if current is None:
            self.client.setex(key, window_seconds, 1)
            return True, max_requests - 1

        current_count = int(current)
        if current_count >= max_requests:
            return False, 0

        self.client.incr(key)
        return True, max_requests - current_count - 1


# Singleton instance
redis_service = RedisService()
