import path from 'path'
import crypto from 'crypto'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

interface StorageAdapter {
  save(
    userId: string,
    buffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<{ storedName: string; path: string; size: number }>
  delete(filePath: string): Promise<void>
  getReadStream(filePath: string): ReadableStream
}

class R2StorageAdapter implements StorageAdapter {
  private getClient(): S3Client {
    return new S3Client({
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      region: 'auto',
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    })
  }

  private get bucket(): string {
    return process.env.CLOUDFLARE_R2_BUCKET!
  }

  async save(
    userId: string,
    buffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<{ storedName: string; path: string; size: number }> {
    const ext = path.extname(originalName)
    const storedName = `${crypto.randomUUID()}${ext}`
    const key = `${userId}/${storedName}`

    await this.getClient().send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ContentLength: buffer.length,
      })
    )

    return { storedName: key, path: key, size: buffer.length }
  }

  async delete(filePath: string): Promise<void> {
    await this.getClient().send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: filePath,
      })
    )
  }

  // Files are served via public R2 URL — streaming from server is not needed
  getReadStream(_filePath: string): ReadableStream {
    throw new Error('getReadStream is not supported for R2; use the public URL instead')
  }
}

/*
// Local filesystem adapter — kept for reference / local development
import fs from 'fs'
import { promises as fsp } from 'fs'
import { Readable } from 'stream'

class LocalStorageAdapter implements StorageAdapter {
  private readonly baseDir: string

  constructor() {
    this.baseDir = process.env.UPLOAD_DIR ?? './uploads'
  }

  async save(
    userId: string,
    buffer: Buffer,
    originalName: string,
    _mimeType: string
  ): Promise<{ storedName: string; path: string; size: number }> {
    const userDir = path.join(this.baseDir, userId)
    await fsp.mkdir(userDir, { recursive: true })

    const ext = path.extname(originalName)
    const storedName = `${crypto.randomUUID()}${ext}`
    const relativePath = path.join(userId, storedName)
    const absolutePath = path.join(this.baseDir, relativePath)

    await fsp.writeFile(absolutePath, buffer)

    return { storedName, path: relativePath, size: buffer.length }
  }

  async delete(filePath: string): Promise<void> {
    const absolutePath = path.join(this.baseDir, filePath)
    await fsp.unlink(absolutePath)
  }

  getReadStream(filePath: string): ReadableStream {
    const absolutePath = path.join(this.baseDir, filePath)
    const nodeStream = fs.createReadStream(absolutePath)
    return Readable.toWeb(nodeStream) as ReadableStream
  }
}
*/

export const storage: StorageAdapter = new R2StorageAdapter()
