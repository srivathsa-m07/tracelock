/**
 * Scan Controller
 *
 * Accepts a multipart upload with:
 *   - file: package.json (required)
 *   - lockfile: package-lock.json / yarn.lock / pnpm-lock.yaml (optional)
 *
 * When a lockfile is present, builds a full transitive dependency graph.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { parsePackageJson, parseWithLockfile, saveScanToDatabase } from './scan.service';

export async function scanPackageJsonController(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const parts = request.parts();

  let packageJsonRaw: string | null = null;
  let lockfileRaw: string | null = null;
  let lockfileFilename: string | null = null;

  for await (const part of parts) {
    if (part.type !== 'file') continue;

    const chunks: Buffer[] = [];
    for await (const chunk of part.file) chunks.push(chunk);
    const content = Buffer.concat(chunks).toString('utf-8');

    if (part.fieldname === 'file' || part.filename === 'package.json') {
      packageJsonRaw = content;
    } else if (
      part.fieldname === 'lockfile' ||
      (part.filename &&
        (part.filename.includes('package-lock') ||
          part.filename.includes('yarn.lock') ||
          part.filename.includes('pnpm-lock')))
    ) {
      lockfileRaw = content;
      lockfileFilename = part.filename ?? 'package-lock.json';
    } else if (part.fieldname === 'file') {
      packageJsonRaw = content;
    }
  }

  if (!packageJsonRaw) {
    return reply.code(400).send({ error: 'No file uploaded. Please upload a package.json file.' });
  }

  try {
    if (lockfileRaw && lockfileFilename) {
      const { result, tree } = parseWithLockfile(packageJsonRaw, lockfileRaw, lockfileFilename);
      const savedScan = await saveScanToDatabase(result, tree);
      return reply.code(200).send({ ...savedScan, hasLockfile: true });
    } else {
      const parseResult = parsePackageJson(packageJsonRaw);
      const savedScan = await saveScanToDatabase(parseResult);
      return reply.code(200).send({ ...savedScan, hasLockfile: false });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to process uploaded files.';
    return reply.code(422).send({ error: message });
  }
}
