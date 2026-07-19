// Simple in-memory TTL cache
const store = new Map();

/**
 * Get a value from the cache
 * @param {string} key 
 * @returns {any|null} The cached value or null if expired/missing
 */
export const getCache = (key) => {
  const item = store.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    store.delete(key);
    return null;
  }
  return item.value;
};

/**
 * Set a value in the cache
 * @param {string} key 
 * @param {any} value 
 * @param {number} ttlSeconds Time to live in seconds
 */
export const setCache = (key, value, ttlSeconds = 300) => {
  store.set(key, {
    value,
    expiry: Date.now() + (ttlSeconds * 1000)
  });
};

/**
 * Delete a specific key from the cache
 */
export const deleteCache = (key) => {
  store.delete(key);
};

/**
 * Clear the entire cache
 */
export const clearCache = () => {
  store.clear();
};
