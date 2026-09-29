import type {
  FastifyInstance as FastifyInstanceType,
  FastifyReply as FastifyReplyType,
  FastifyRequest as FastifyRequestType,
  RouteGenericInterface,
} from "fastify";

export type FastifyInstance = FastifyInstanceType;
export type FastifyRequest<
  RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
> = FastifyRequestType<RouteGeneric>;
export type FastifyReply = FastifyReplyType;
