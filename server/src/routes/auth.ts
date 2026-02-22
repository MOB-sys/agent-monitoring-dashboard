import { Router } from 'express';
import { userStore } from '../auth/users.js';
import { requireAuth, requireRole } from '../auth/middleware.js';

export function createAuthRouter(): Router {
  const router = Router();

  router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const result = await userStore.authenticate(username, password);
    if (!result) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json(result);
  });

  router.get('/me', requireAuth, (req, res) => {
    const user = userStore.findById(req.user!.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });

  router.get('/users', requireAuth, requireRole('admin'), (_req, res) => {
    res.json(userStore.listUsers());
  });

  router.post('/users', requireAuth, requireRole('admin'), async (req, res) => {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: 'All fields required' });
    }
    const user = await userStore.createUser(username, password, name, role);
    res.status(201).json(user);
  });

  router.delete('/users/:id', requireAuth, requireRole('admin'), (req, res) => {
    const deleted = userStore.deleteUser(req.params.id);
    if (!deleted) return res.status(400).json({ error: 'Cannot delete this user' });
    res.status(204).send();
  });

  return router;
}
