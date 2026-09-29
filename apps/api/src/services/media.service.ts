import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { MultipartFile } from "@fastify/multipart";
import { put } from "@vercel/blob";
import { uploadsDir } from "../storage.js";

function getMediaType(mimeType: string): "IMAGE" | "VIDEO" | "AUDIO" | "MODEL_3D" {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("audio/")) return "AUDIO";
  if (mimeType.startsWith("model/")) return "MODEL_3D";
  return "IMAGE";
}

export class MediaService {
  async upload(file: MultipartFile, userId: string) {
    const ext = file.filename.split(".").pop() ?? "bin";
    const filename = `${randomUUID()}.${ext}`;
    const userDir = join(uploadsDir, userId);
    await mkdir(userDir, { recursive: true });
    const filePath = join(userDir, filename);

    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (process.env.VERCEL) {
      const blob = await put(`${userId}/${filename}`, buffer, {
        access: "public",
        contentType: file.mimetype,
        addRandomSuffix: true,
      });
      return {
        key: blob.pathname,
        url: blob.url,
        mimeType: file.mimetype,
        size: buffer.length,
        type: getMediaType(file.mimetype),
      };
    }

    await writeFile(filePath, buffer);

    const url = `/uploads/${userId}/${filename}`;

    return {
      key: `${userId}/${filename}`,
      url,
      mimeType: file.mimetype,
      size: buffer.length,
      type: getMediaType(file.mimetype),
    };
  }

  async getPresignedUrl(opts: {
    filename: string;
    mimeType: string;
    size: number;
    userId: string;
  }) {
    if (opts.size > 100 * 1024 * 1024) {
      throw Object.assign(new Error("File too large (max 100 MB)"), { statusCode: 400 });
    }

    const ext = opts.filename.split(".").pop() ?? "bin";
    const key = `${opts.userId}/${randomUUID()}.${ext}`;
    const uploadUrl = `/api/media/upload`;
    const downloadUrl = `/uploads/${key}`;

    return { uploadUrl, downloadUrl, key, expiresIn: 300 };
  }
}
