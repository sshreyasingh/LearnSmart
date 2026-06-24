const progressListeners = new Map();

const sendProgress = (projectId, phase, data = {}) => {
  const listeners = progressListeners.get(projectId?.toString?.());
  if (listeners) {
    listeners.forEach((listener) => {
      try { listener({ phase, ...data }); } catch {}
    });
  }
};

const addListener = (projectId, callback) => {
  const id = projectId?.toString?.();
  if (!id) return () => {};
  if (!progressListeners.has(id)) progressListeners.set(id, new Set());
  progressListeners.get(id).add(callback);
  return () => {
    const set = progressListeners.get(id);
    if (set) { set.delete(callback); if (set.size === 0) progressListeners.delete(id); }
  };
};

module.exports = { sendProgress, addListener };
