import type { FastifyInstance, FastifyReply } from "fastify";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { MediaService } from "../services/media.service.js";
import { authenticate } from "../middleware/authenticate.js";

export async function mediaRoutes(app: FastifyInstance) {
  const mediaService = new MediaService();

  // Large client uploads go directly to durable Vercel Blob storage.
  app.post(
    "/upload-token",
    {
      schema: {
        tags: ["media"],
        summary: "Authorize a direct media upload",
      },
      preHandler: async (request, reply) => {
        const body = request.body as HandleUploadBody | undefined;
        // Vercel Blob authenticates completion callbacks with its signed token.
        if (body?.type !== "blob.upload-completed") {
          await authenticate(request, reply);
        }
      },
    },
    async (request: any, reply: FastifyReply) => {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return reply.status(503).send({
          success: false,
          error: "Kalıcı dosya depolama yapılandırılmamış.",
        });
      }

      const body = request.body as HandleUploadBody;
      const result = await handleUpload({
        body,
        request: request.raw,
        onBeforeGenerateToken: async () => {
          const allowedContentTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "video/mp4",
            "video/webm",
            "video/quicktime",
            "audio/mpeg",
            "audio/mp4",
            "audio/wav",
            "audio/ogg",
            "audio/webm",
            "model/gltf-binary",
            "model/gltf+json",
          ];
          return {
            allowedContentTypes,
            maximumSizeInBytes: 100 * 1024 * 1024,
            addRandomSuffix: true,
            tokenPayload: JSON.stringify({ userId: request.user.id }),
          };
        },
        onUploadCompleted: async () => {},
      });
      return reply.send(result);
    },
  );

  // POST /api/media/upload
  app.post(
    "/upload",
    {
      schema: {
        tags: ["media"],
        summary: "Upload a media file (image, video, audio)",
        security: [{ bearerAuth: [] }],
        consumes: ["multipart/form-data"],
      },
      preHandler: authenticate,
    },
    async (request: any, reply: FastifyReply) => {
      const data = await request.file();
      if (!data) {
        return reply
          .status(400)
          .send({ success: false, error: "No file provided" });
      }

      // Validate MIME types (security)
      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "audio/mpeg",
        "audio/mp4",
        "audio/wav",
        "audio/ogg",
        "audio/webm",
        "model/gltf-binary",
        "model/gltf+json",
      ];

      if (!allowedMimeTypes.includes(data.mimetype)) {
        return reply.status(400).send({
          success: false,
          error: "File type not allowed",
        });
      }

      const result = await mediaService.upload(data, request.user.id);
      return reply.status(201).send({ success: true, data: result });
    },
  );

  // GET /api/media/presign — Get presigned URL for direct S3 upload
  app.post<{
    Body: { filename: string; mimeType: string; size: number };
  }>(
    "/presign",
    {
      schema: {
        tags: ["media"],
        summary: "Get a presigned URL for direct upload to S3",
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { filename, mimeType, size } = request.body;
      const result = await mediaService.getPresignedUrl({
        filename,
        mimeType,
        size,
        userId: request.user.id,
      });
      return reply.send({ success: true, data: result });
    },
  );
}
