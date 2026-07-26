import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { mkdir, unlink, writeFile, readFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export const RESUME_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export const RESUME_ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]);

export const RESUME_ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.doc']);

export type StorageProviderName = 'local' | 's3';

export type StoredObject = {
  key: string;
  provider: StorageProviderName;
  size: number;
};

export type ResumeFileValidation = {
  ok: true;
  mimeType: string;
  extension: string;
} | {
  ok: false;
  message: string;
};

/**
 * Resolve the local upload root.
 *
 * Relative paths resolve against the workspace root, not `process.cwd()`, so the
 * web app (cwd `apps/web`) and the queue worker (cwd `apps/api`) read and write the
 * same directory. Absolute paths are honoured as given.
 */
function localRoot() {
  const configured = process.env.UPLOAD_DIR?.trim();

  if (configured && isAbsolute(configured)) {
    return configured;
  }

  return resolve(workspaceRoot(), configured || 'uploads');
}

let cachedWorkspaceRoot: string | null = null;

function workspaceRoot() {
  if (cachedWorkspaceRoot) {
    return cachedWorkspaceRoot;
  }

  let current = process.cwd();

  while (true) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) {
      cachedWorkspaceRoot = current;
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      // Not inside the monorepo (e.g. a standalone deployment) — use the cwd.
      cachedWorkspaceRoot = process.cwd();
      return cachedWorkspaceRoot;
    }

    current = parent;
  }
}

function s3Configured() {
  return Boolean(
    process.env.S3_BUCKET?.trim() &&
      process.env.S3_ACCESS_KEY_ID?.trim() &&
      process.env.S3_SECRET_ACCESS_KEY?.trim(),
  );
}

function getS3Client() {
  const region = process.env.S3_REGION?.trim() || 'us-east-1';
  const endpoint = process.env.S3_ENDPOINT?.trim();

  return new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || Boolean(endpoint),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
}

export function activeStorageProvider(): StorageProviderName {
  return s3Configured() ? 's3' : 'local';
}

export function validateResumeFile(input: {
  fileName: string;
  mimeType: string;
  size: number;
}): ResumeFileValidation {
  if (!input.fileName?.trim()) {
    return { ok: false, message: 'File name is required' };
  }

  if (input.size <= 0) {
    return { ok: false, message: 'File is empty' };
  }

  if (input.size > RESUME_MAX_BYTES) {
    return { ok: false, message: 'File must be 5 MB or smaller' };
  }

  const extension = extname(input.fileName).toLowerCase();
  if (!RESUME_ALLOWED_EXTENSIONS.has(extension)) {
    return { ok: false, message: 'Only PDF and DOCX files are supported' };
  }

  const mime = input.mimeType || guessMimeFromExtension(extension);
  if (!RESUME_ALLOWED_MIME.has(mime)) {
    return { ok: false, message: 'Only PDF and DOCX files are supported' };
  }

  return { ok: true, mimeType: mime, extension };
}

export function guessMimeFromExtension(extension: string) {
  if (extension === '.pdf') return 'application/pdf';
  if (extension === '.docx') {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (extension === '.doc') return 'application/msword';
  return 'application/octet-stream';
}

export function buildResumeStorageKey(userId: string, fileName: string) {
  const extension = extname(fileName).toLowerCase() || '.bin';
  return `resumes/${userId}/${randomUUID()}${extension}`;
}

export async function putObject(key: string, body: Buffer | Uint8Array, mimeType: string): Promise<StoredObject> {
  const provider = activeStorageProvider();
  const size = body.byteLength;

  if (provider === 's3') {
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: body,
        ContentType: mimeType,
      }),
    );
    return { key, provider, size };
  }

  const fullPath = join(localRoot(), key);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, body);
  return { key, provider, size };
}

export async function getObjectBuffer(key: string, provider: StorageProviderName = activeStorageProvider()) {
  if (provider === 's3') {
    const client = getS3Client();
    const result = await client.send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
      }),
    );
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) throw new Error('Object not found');
    return Buffer.from(bytes);
  }

  const fullPath = join(localRoot(), key);
  if (!existsSync(fullPath)) throw new Error('Object not found');
  return readFile(fullPath);
}

export async function getObjectStream(key: string, provider: StorageProviderName = activeStorageProvider()) {
  if (provider === 's3') {
    const client = getS3Client();
    const result = await client.send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
      }),
    );
    if (!result.Body) throw new Error('Object not found');
    return result.Body as Readable;
  }

  const fullPath = join(localRoot(), key);
  if (!existsSync(fullPath)) throw new Error('Object not found');
  return createReadStream(fullPath);
}

export async function deleteObject(key: string, provider: StorageProviderName = activeStorageProvider()) {
  if (provider === 's3') {
    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
      }),
    );
    return;
  }

  const fullPath = join(localRoot(), key);
  if (existsSync(fullPath)) {
    await unlink(fullPath);
  }
}

/** Convenience for piping an incoming Node stream to local disk during uploads. */
export async function writeLocalStream(key: string, stream: Readable) {
  const fullPath = join(localRoot(), key);
  await mkdir(dirname(fullPath), { recursive: true });
  await pipeline(stream, createWriteStream(fullPath));
  return fullPath;
}
