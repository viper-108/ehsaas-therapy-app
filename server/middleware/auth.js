import jwt from 'jsonwebtoken';
import Therapist from '../models/Therapist.js';
import Client from '../models/Client.js';
import Admin from '../models/Admin.js';

export const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;

    if (decoded.role === 'therapist') {
      req.user = await Therapist.findById(decoded.id).select('-password');
    } else if (decoded.role === 'client') {
      req.user = await Client.findById(decoded.id).select('-password');
    } else if (decoded.role === 'admin') {
      req.user = await Admin.findById(decoded.id).select('-password');
    }

    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const therapistOnly = (req, res, next) => {
  if (req.userRole !== 'therapist') {
    return res.status(403).json({ message: 'Therapist access only' });
  }
  next();
};

export const clientOnly = (req, res, next) => {
  if (req.userRole !== 'client') {
    return res.status(403).json({ message: 'Client access only' });
  }
  next();
};

export const adminOnly = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' });
  }
  next();
};
