import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useMonitoringStore } from '../store/useMonitoringStore';
import type { MetricsSnapshot } from '../types';

const SOCKET_URL = 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const metricsBufferRef = useRef<MetricsSnapshot | null>(null);
  const store = useMonitoringStore;

  useEffect(() => {
    const token = store.getState().token;
    const socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: Infinity,
      auth: token ? { token } : undefined,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to monitoring server');
      store.getState().setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from monitoring server');
      store.getState().setConnected(false);
    });

    // Batched metrics updates via requestAnimationFrame
    socket.on('metrics:update', (data: MetricsSnapshot) => {
      metricsBufferRef.current = data;
    });

    socket.on('agent:activity', (data) => {
      store.getState().addActivity(data);
    });

    socket.on('trace:new', (data) => {
      store.getState().addTrace(data);
    });

    socket.on('trace:update', (data) => {
      store.getState().updateTrace(data);
    });

    // Anomaly detection events
    socket.on('anomaly:detected', (data) => {
      store.getState().addAnomaly(data);
    });

    // Orchestration updates
    socket.on('orchestration:update', (data) => {
      store.getState().updateOrchestration(data);
    });

    // Alert events
    socket.on('alert:firing', (data) => {
      store.getState().addAlertEvent(data);
    });

    socket.on('alert:resolved', (data) => {
      store.getState().addAlertEvent(data);
    });

    // requestAnimationFrame flush loop
    let rafId: number;
    const flush = () => {
      if (metricsBufferRef.current) {
        store.getState().updateMetrics(metricsBufferRef.current);
        metricsBufferRef.current = null;
      }
      rafId = requestAnimationFrame(flush);
    };
    rafId = requestAnimationFrame(flush);

    // Fetch initial alert rules and channels
    fetch('http://localhost:3001/api/alerts/rules')
      .then(res => res.json())
      .then(rules => store.getState().setAlertRules(rules))
      .catch(console.error);

    fetch('http://localhost:3001/api/alerts/channels')
      .then(res => res.json())
      .then(channels => store.getState().setChannels(channels))
      .catch(console.error);

    fetch('http://localhost:3001/api/alerts/history')
      .then(res => res.json())
      .then(events => {
        for (const event of events) {
          store.getState().addAlertEvent(event);
        }
      })
      .catch(console.error);

    return () => {
      cancelAnimationFrame(rafId);
      socket.disconnect();
    };
  }, []);

  return socketRef;
}
