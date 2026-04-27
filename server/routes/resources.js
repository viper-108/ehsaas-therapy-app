import express from 'express';
import Resource from '../models/Resource.js';
import { protect, therapistOnly, clientOnly } from '../middleware/auth.js';

const router = express.Router();

// POST /api/resources — therapist creates resource
router.post('/', protect, therapistOnly, async (req, res) => {
  try {
    const body = { ...req.body, therapistId: req.userId };
    // Sync legacy isPublic flag with visibility
    if (body.visibility === 'all_clients') body.isPublic = true;
    if (body.visibility && body.visibility !== 'all_clients') body.isPublic = false;
    const resource = await Resource.create(body);
    res.status(201).json(resource);
  } catch (error) {
    console.error('Create resource error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/resources/my — therapist's own resources (any visibility) + central therapist library
router.get('/my', protect, therapistOnly, async (req, res) => {
  try {
    // tab can be: own | therapist_central | client_central
    const tab = req.query.tab || 'own';
    let query;
    if (tab === 'therapist_central') {
      // All therapists' shared resources (excluding own)
      query = { visibility: 'all_therapists', therapistId: { $ne: req.userId } };
    } else if (tab === 'client_central') {
      // What's visible to all clients
      query = { $or: [{ visibility: 'all_clients' }, { isPublic: true }] };
    } else {
      // own — every resource owned by this therapist
      query = { therapistId: req.userId };
    }
    const resources = await Resource.find(query)
      .populate('therapistId', 'name title')
      .sort({ createdAt: -1 });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/resources/shared — client sees resources shared with them OR public to all clients
router.get('/shared', protect, clientOnly, async (req, res) => {
  try {
    // tab can be: assigned | public
    const tab = req.query.tab || 'all';
    let query;
    if (tab === 'assigned') {
      // Client-specific (only sharedWith me)
      query = { sharedWith: req.userId, visibility: 'specific_clients' };
    } else if (tab === 'public') {
      // Central public library
      query = { $or: [{ visibility: 'all_clients' }, { isPublic: true }] };
    } else {
      // both
      query = {
        $or: [
          { sharedWith: req.userId },
          { visibility: 'all_clients' },
          { isPublic: true }
        ]
      };
    }
    const resources = await Resource.find(query)
      .populate('therapistId', 'name title')
      .sort({ createdAt: -1 });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/resources/public — public resources for client landing
router.get('/public', async (req, res) => {
  try {
    const resources = await Resource.find({ $or: [{ visibility: 'all_clients' }, { isPublic: true }] })
      .populate('therapistId', 'name title').sort({ createdAt: -1 });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/resources/:id — update resource (owner only)
router.put('/:id', protect, therapistOnly, async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.visibility === 'all_clients') update.isPublic = true;
    if (update.visibility && update.visibility !== 'all_clients') update.isPublic = false;
    const resource = await Resource.findOneAndUpdate(
      { _id: req.params.id, therapistId: req.userId },
      update, { new: true }
    );
    if (!resource) return res.status(404).json({ message: 'Not found' });
    res.json(resource);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/resources/:id/share — share with specific clients (sets visibility to specific_clients)
router.put('/:id/share', protect, therapistOnly, async (req, res) => {
  try {
    const { clientIds } = req.body;
    const resource = await Resource.findOneAndUpdate(
      { _id: req.params.id, therapistId: req.userId },
      {
        $addToSet: { sharedWith: { $each: clientIds || [] } },
        $set: { visibility: 'specific_clients', isPublic: false }
      },
      { new: true }
    );
    if (!resource) return res.status(404).json({ message: 'Not found' });
    res.json(resource);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/resources/:id/visibility — quickly change visibility tier
router.put('/:id/visibility', protect, therapistOnly, async (req, res) => {
  try {
    const { visibility } = req.body;
    const valid = ['private', 'all_therapists', 'all_clients', 'specific_clients'];
    if (!valid.includes(visibility)) return res.status(400).json({ message: 'Invalid visibility' });
    const update = { visibility, isPublic: visibility === 'all_clients' };
    const resource = await Resource.findOneAndUpdate(
      { _id: req.params.id, therapistId: req.userId },
      update, { new: true }
    );
    if (!resource) return res.status(404).json({ message: 'Not found' });
    res.json(resource);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/resources/:id
router.delete('/:id', protect, therapistOnly, async (req, res) => {
  try {
    await Resource.findOneAndDelete({ _id: req.params.id, therapistId: req.userId });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
