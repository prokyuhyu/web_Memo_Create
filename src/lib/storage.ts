import fs from 'fs'
import { promises as fsp } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { Readable } from 'stream'

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

// TODO: Swap LocalStorageAdapter with S3Adapter here for production
export const storage: StorageAdapter = new LocalStorageAdapter()
