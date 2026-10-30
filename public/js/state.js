/**
 * PulseBoard Global State
 */

const State = (() => {
  const store = {
    currentUser: null,
    projects: [],
    currentProject: null,
    usersList: [],
    filterSearch: '',
    filterPriority: '',
    selectedTask: null
  };

  const subscribers = [];

  function getState() {
    return store;
  }

  function setState(updates) {
    Object.assign(store, updates);
    subscribers.forEach((fn) => {
      try { fn(store); } catch (e) { console.error('State subscriber error:', e); }
    });
  }

  function subscribe(fn) {
    subscribers.push(fn);
    return () => {
      const idx = subscribers.indexOf(fn);
      if (idx !== -1) subscribers.splice(idx, 1);
    };
  }

  return {
    getState,
    setState,
    subscribe
  };
})();
