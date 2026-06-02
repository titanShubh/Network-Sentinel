import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const { token } = useAuth();
  const [scanProgress, setScanProgress] = useState({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      setScanProgress({});
      setConnected(false);
      return;
    }

    let ws = null;
    let reconnectTimeout = null;

    const connect = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.host === 'localhost:3000' ? 'localhost:8081' : window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/api/scans/ws/progress`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        console.log('Progress WebSocket connection established');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setScanProgress(data);
        } catch (e) {
          console.error('Error parsing progress websocket message', e);
        }
      };

      ws.onerror = (error) => {
        console.error('Progress WebSocket error:', error);
      };

      ws.onclose = () => {
        setConnected(false);
        console.log('Progress WebSocket connection closed. Attempting reconnect...');
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [token]);

  return (
    <WebSocketContext.Provider value={{ scanProgress, connected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
export default WebSocketContext;
