/**
 * PulseBoard WebSocket Client
 * Real-Time sync across collaborators
 */

const Realtime = (() => {
  let socket = null;
  const handlers = new Map();

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const token = API.getToken();
    const url = `${protocol}//${host}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    socket = new WebSocket(url);

    socket.onopen = () => {
      const statusBar = document.getElementById('ws-status');
      if (statusBar) {
        statusBar.innerHTML = `
          <span class="status-dot online"></span>
          <span class="status-label">Live WebSockets Connected</span>
        `;
      }
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type && handlers.has(message.type)) {
          handlers.get(message.type).forEach((fn) => fn(message.payload));
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    socket.onclose = () => {
      const statusBar = document.getElementById('ws-status');
      if (statusBar) {
        statusBar.innerHTML = `
          <span class="status-dot" style="background: #f59e0b;"></span>
          <span class="status-label">Reconnecting Live Sync...</span>
        `;
      }
      setTimeout(connect, 3000);
    };

    socket.onerror = (err) => {
      console.warn('WebSocket connection error:', err);
    };
  }

  function on(type, callback) {
    if (!handlers.has(type)) {
      handlers.set(type, []);
    }
    handlers.get(type).push(callback);
  }

  return {
    connect,
    on
  };
})();
