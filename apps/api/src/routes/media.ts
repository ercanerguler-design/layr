import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { MediaService } from "../services/media.service.js";
import { authenticate } from "../middleware/authenticate.js";

export async function mediaRoutes(app: FastifyInstance) {
  const mediaService = new MediaService();

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
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ success: false, error: "No file provided" });
      }

      // Validate MIME types (security)
      const allowedMimeTypes = [
        "image/jpeg", "image/png", "image/webp", "image/gif",
        "video/mp4", "video/webm", "video/quicktime",
        "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg",
        "model/gltf-binary", "model/gltf+json",
      ];

      if (!allowedMimeTypes.includes(data.mimetype)) {
        return reply.status(400).send({
          success: false,
          error: "File type not allowed",
        });
      }

      const result = await mediaService.upload(data, request.user.id);
      return reply.status(201).send({ success: true, data: result });
    }
  );

  // GET /api/media/presign — Get presigned URL for direct S3 upload
  app.post(
    "/presign",
    {
      schema: {
        tags: ["media"],
        summary: "Get a presigned URL for direct upload to S3",
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (
      request: FastifyRequest<{
        Body: { filename: string; mimeType: string; size: number };
      }>,
      reply: FastifyReply
    ) => {
      const { filename, mimeType, size } = request.body;
      const result = await mediaService.getPresignedUrl({
        filename,
        mimeType,
        size,
        userId: request.user.id,
      });
      return reply.send({ success: true, data: result });
    }
  );
}
