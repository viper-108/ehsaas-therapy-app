import express from 'express';
import BlogPost from '../models/BlogPost.js';
import Therapist from '../models/Therapist.js';
import { protect, therapistOnly } from '../middleware/auth.js';

const router = express.Router();

// GET /api/blog-posts — list published posts (public)
router.get('/', async (req, res) => {
  try {
    const posts = await BlogPost.find({ isPublished: true })
      .populate('therapistId', 'name title image')
      .sort({ publishedAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/blog-posts/my — therapist's posts (drafts + published)
router.get('/my', protect, therapistOnly, async (req, res) => {
  try {
    const posts = await BlogPost.find({ therapistId: req.userId }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/blog-posts/:id — single post (public)
router.get('/:id', async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id).populate('therapistId', 'name title image');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/blog-posts — create draft
router.post('/', protect, therapistOnly, async (req, res) => {
  try {
    const therapist = await Therapist.findById(req.userId).select('name');
    const post = await BlogPost.create({
      ...req.body,
      therapistId: req.userId,
      author: therapist.name,
    });
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/blog-posts/:id — edit
router.put('/:id', protect, therapistOnly, async (req, res) => {
  try {
    const post = await BlogPost.findOneAndUpdate(
      { _id: req.params.id, therapistId: req.userId },
      req.body, { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Not found' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/blog-posts/:id/publish — publish
router.put('/:id/publish', protect, therapistOnly, async (req, res) => {
  try {
    const post = await BlogPost.findOneAndUpdate(
      { _id: req.params.id, therapistId: req.userId },
      { isPublished: true, publishedAt: new Date() },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Not found' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/blog-posts/:id
router.delete('/:id', protect, therapistOnly, async (req, res) => {
  try {
    await BlogPost.findOneAndDelete({ _id: req.params.id, therapistId: req.userId });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
