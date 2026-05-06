import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESUMES_DIR = path.join(__dirname, '..', 'uploads', 'resumes');
const AVATARS_DIR = path.join(__dirname, '..', 'uploads', 'avatars');

// Ensure the upload directory exists at module load (and in case it's removed at runtime)
const ensureDir = (dir) => {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    console.error('[UPLOAD] Failed to create dir:', dir, e.message);
  }
};
ensureDir(RESUMES_DIR);
ensureDir(AVATARS_DIR);

const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => { ensureDir(RESUMES_DIR); cb(null, RESUMES_DIR); },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => { ensureDir(AVATARS_DIR); cb(null, AVATARS_DIR); },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
  }
});

const resumeFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
};

const imageFilter = (req, file, cb) => {
  const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only PNG, JPG, JPEG, GIF, WEBP images are allowed'), false);
};

export const uploadResume = multer({
  storage: resumeStorage,
  fileFilter: resumeFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).single('resume');

export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB
}).single('avatar');
