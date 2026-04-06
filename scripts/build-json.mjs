import { readFile, readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { join, basename, extname, dirname } from 'node:path';
import matter from 'gray-matter';

function toArray(value) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return [value];
  return [];
}

function slugify(filename) {
  return basename(filename, extname(filename));
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}-${month}-${year}`;
}

function normalizeDate(value, fallback) {
  if (!value) return formatDate(fallback);
  if (value instanceof Date) return formatDate(value);
  if (typeof value === 'string' && value.trim()) return value.trim();
  return formatDate(fallback);
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readMarkdownFiles(dir) {
  if (!(await exists(dir))) return [];
  const entries = await readdir(dir);
  return entries.filter(f => f.endsWith('.md')).map(f => join(dir, f));
}

async function parseSkill(filePath) {
  const raw = await readFile(filePath, 'utf-8');
  const { data, content } = matter(raw);
  const stats = await stat(filePath);
  const createdAt = normalizeDate(data['createdAt'], stats.birthtime);
  const updatedAt = normalizeDate(data['updatedAt'], stats.mtime);
  return {
    slug: slugify(filePath),
    name: String(data['name'] ?? slugify(filePath)),
    description: String(data['description'] ?? ''),
    context: toArray(data['context']),
    tech: toArray(data['tech']),
    tags: toArray(data['tags']),
    author: String(data['author'] ?? 'Unknown'),
    body: content.trim(),
    createdAt,
    updatedAt,
  };
}

async function parseRule(filePath) {
  const raw = await readFile(filePath, 'utf-8');
  const { data, content } = matter(raw);
  return {
    slug: slugify(filePath),
    name: String(data['name'] ?? slugify(filePath)),
    description: String(data['description'] ?? ''),
    skills: toArray(data['skills']),
    tags: toArray(data['tags']),
    author: String(data['author'] ?? 'Unknown'),
    body: content.trim(),
  };
}

async function scanContentDir(baseDir) {
  const skillsDir = join(baseDir, 'skills');
  const rulesDir = join(baseDir, 'rules');

  const [skillFiles, ruleFiles] = await Promise.all([
    readMarkdownFiles(skillsDir),
    readMarkdownFiles(rulesDir),
  ]);

  const [skills, rules] = await Promise.all([
    Promise.all(skillFiles.map(parseSkill)),
    Promise.all(ruleFiles.map(parseRule)),
  ]);

  return { skills, rules };
}

// CLI: node scripts/build-json.mjs <content-dir> <output-file>
const contentDir = process.argv[2];
const outputFile = process.argv[3];

if (!contentDir || !outputFile) {
  console.error('Usage: node scripts/build-json.mjs <content-dir> <output-file>');
  process.exit(1);
}

const data = await scanContentDir(contentDir);
await mkdir(dirname(outputFile), { recursive: true });
await writeFile(outputFile, JSON.stringify(data, null, 2), 'utf-8');

console.log(`Generated ${outputFile}: ${data.skills.length} skills, ${data.rules.length} rules`);
