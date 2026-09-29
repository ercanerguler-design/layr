import { tmpdir } from "os";
import { join } from "path";

// Vercel functions only provide writable temporary storage. Use it for the
// current local upload implementation until durable object storage is wired in.
export const uploadsDir = process.env.VERCEL
  ? join(tmpdir(), "layr-uploads")
  : join(process.cwd(), "uploads");
