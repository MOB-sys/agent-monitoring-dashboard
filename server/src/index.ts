import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { AgentSimulator } from './simulator.js';
import { register, updatePrometheusMetrics } from './prometheus.js';
import { AlertEngine } from './alerts/engine.js';
import { createAlertRouter } from './routes/alerts.js';
import { LangfuseIntegration } from './integrations/langfuse.js';
import { createIntegrationRouter } from './routes/integrations.js';
import { optionalAuth } from './auth/middleware.js';
import { createAuthRouter } from './routes/auth.js';
import { AnomalyDetector } from './anomaly/detector.js';
import { auditLogger } from './audit/logger.js';
import { createAuditRouter } from './routes/audit.js';
import { createCostRouter } from './routes/cost.js';
import { OrchestrationManager } from './orchestration.js';
import { ModeManager } from './mode-manager.js';
import { LiveDataManager } from './ingest/live-data-manager.js';
import { ApiKeyManager } from './ingest/api-keys.js';
import { createIngestRouter } from './ingest/router.js';
import { setupIngestNamespace } from './ingest/socket-handler.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: ['http://localhost:5173', 'http://localhost:5174'], methods: ['GET', 'POST'] }
});

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));
app.use(express.json());
app.use(optionalAuth);
app.use(auditLogger.middleware());

const simulator = new AgentSimulator();
const liveDataManager = new LiveDataManager();
const apiKeyManager = new ApiKeyManager();
const modeManager = new ModeManager(simulator, liveDataManager);
const alertEngine = new AlertEngine();
const langfuse = new LangfuseIntegration();
const anomalyDetector = new AnomalyDetector();
const orchestrationManager = new OrchestrationManager();

// Alert callback - emit socket events for firing/resolved alerts
alertEngine.setAlertCallback((event) => {
  if (event.status === 'firing') {
    io.emit('alert:firing', event);
  } else {
    io.emit('alert:resolved', event);
  }
});

anomalyDetector.setCallback((event) => {
  io.emit('anomaly:detected', event);
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), mode: modeManager.getMode() });
});

// Mode management endpoints
app.get('/api/mode', (_req, res) => {
  res.json({
    mode: modeManager.getMode(),
    liveAgents: liveDataManager.getAgentCount(),
    apiKey: apiKeyManager.getDefaultKey(),
  });
});

app.put('/api/mode', (req, res) => {
  const { mode } = req.body;
  if (!mode || !['simulator', 'live', 'hybrid'].includes(mode)) {
    res.status(400).json({ error: 'mode must be one of: simulator, live, hybrid' });
    return;
  }
  modeManager.setMode(mode);
  res.json({ mode: modeManager.getMode() });
});

// Alert routes
app.use('/api/alerts', createAlertRouter(alertEngine));

// Integration routes
app.use('/api/integrations', createIntegrationRouter(langfuse));

// Auth routes
app.use('/api/auth', createAuthRouter());

// Audit routes
app.use('/api/audit', createAuditRouter());

// Cost routes
app.use('/api/cost', createCostRouter(modeManager));

// Ingest routes (SDK data collection)
app.use('/api/ingest', createIngestRouter(
  liveDataManager,
  apiKeyManager,
  (activity) => io.emit('agent:activity', activity),
  (trace) => io.emit('trace:new', trace),
));

// Anomaly detection config endpoints
app.get('/api/anomaly/config', (_req, res) => res.json(anomalyDetector.getConfig()));
app.put('/api/anomaly/config', (req, res) => { anomalyDetector.updateConfig(req.body); res.json(anomalyDetector.getConfig()); });
app.get('/api/anomaly/history', (_req, res) => res.json(anomalyDetector.getHistory()));

// Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Setup ingest WebSocket namespace
setupIngestNamespace(
  io,
  liveDataManager,
  apiKeyManager,
  (activity) => io.emit('agent:activity', activity),
  (trace) => io.emit('trace:new', trace),
);

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send initial snapshot
  socket.emit('metrics:update', modeManager.getMetricsSnapshot());

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Emit metrics every 1 second
setInterval(() => {
  modeManager.tick();
  const snapshot = modeManager.getMetricsSnapshot();
  io.emit('metrics:update', snapshot);
  alertEngine.evaluate(snapshot);
  updatePrometheusMetrics(snapshot);
  anomalyDetector.evaluate(snapshot);
  orchestrationManager.tick(snapshot.agents);
}, 1000);

// Emit activities every 2-5 seconds (simulator mode only)
function emitActivity() {
  const activity = modeManager.generateActivity();
  if (activity) {
    io.emit('agent:activity', activity);
  }
  setTimeout(emitActivity, 2000 + Math.random() * 3000);
}
emitActivity();

// Emit traces every 5-10 seconds (simulator mode only)
function emitTrace() {
  const trace = modeManager.generateTrace();
  if (trace) {
    io.emit('trace:new', trace);
    // Sometimes update it after a delay
    if (trace.status === 'running') {
      setTimeout(() => {
        trace.status = 'completed';
        trace.endTime = new Date().toISOString();
        trace.totalDuration = Date.now() - new Date(trace.startTime).getTime();
        io.emit('trace:update', trace);
      }, 2000 + Math.random() * 5000);
    }
  }
  setTimeout(emitTrace, 5000 + Math.random() * 5000);
}
emitTrace();

// Emit orchestration state every 2 seconds
setInterval(() => {
  const snapshot = modeManager.getMetricsSnapshot();
  io.emit('orchestration:update', orchestrationManager.getState(snapshot.agents));
}, 2000);

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Agent Monitoring Server running on http://localhost:${PORT}`);
  console.log(`Data mode: ${modeManager.getMode()}`);
  console.log(`Ingest API key: ${apiKeyManager.getDefaultKey()}`);
});
