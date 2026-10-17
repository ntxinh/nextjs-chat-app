import "zod-openapi";
import { z } from "zod";
import { createDocument } from "zod-openapi";
import {
  addMemberSchema,
  createConversationSchema,
  listQuerySchema,
  markReadSchema,
  renameConversationSchema,
} from "@/lib/validation/conversations";
import { patchMeSchema } from "@/lib/validation/me";
import { editMessageSchema, listMessagesQuery, sendMessageSchema } from "@/lib/validation/messages";
import { userSearchQuerySchema } from "@/lib/validation/users";

// Shapes mirror src/server/services/{conversations,messages}.ts DTOs and
// src/lib/api/respond.ts's {data}|{error} envelope. Keep in sync — `pnpm api:check`
// regenerates the committed openapi/openapi.json and fails on drift.

const id = z.string();
const dateTime = z.iso.datetime();

const publicUser = z
  .object({ id, name: z.string(), image: z.string().nullable() })
  .meta({ id: "PublicUser" });

const messageDto = z
  .object({
    id,
    conversationId: id,
    sender: publicUser,
    body: z.string(),
    createdAt: dateTime,
    editedAt: dateTime.nullable(),
    deleted: z.boolean(),
  })
  .meta({ id: "Message" });

const conversationSummary = z
  .object({
    id,
    type: z.enum(["direct", "group"]),
    name: z.string().nullable(),
    preview: z.object({ body: z.string(), senderName: z.string(), createdAt: dateTime }).nullable(),
    unreadCount: z.number().int(),
    otherUser: publicUser.optional(),
  })
  .meta({ id: "ConversationSummary" });

const conversationDetail = conversationSummary
  .extend({
    members: z.array(
      publicUser.extend({
        role: z.enum(["owner", "member"]),
        lastSeenAt: dateTime.nullable(),
        lastReadMessageId: id.nullable(),
      }),
    ),
  })
  .meta({ id: "ConversationDetail" });

const me = z
  .object({
    id,
    name: z.string(),
    email: z.string(),
    image: z.string().nullable(),
    lastSeenAt: dateTime.nullable(),
  })
  .meta({ id: "Me" });

const errorResponse = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      issues: z.unknown().optional(),
    }),
  })
  .meta({ id: "ErrorResponse" });

const data = (schema: z.ZodType) => z.object({ data: schema });
const json = (schema: z.ZodType) => ({
  content: { "application/json": { schema } },
});
const errors = (...codes: number[]) =>
  Object.fromEntries(
    codes.map((c) => [String(c), { description: "Error", ...json(errorResponse) }]),
  );
const convPath = z.object({ conversationId: id });
const msgPath = z.object({ messageId: id });
const userPath = z.object({ userId: id });

export function buildOpenApiDocument() {
  return createDocument({
    openapi: "3.1.0",
    info: { title: "Chat API", version: "1.0.0" },
    servers: [{ url: "/api/v1" }],
    security: [{ sessionCookie: [] }],
    components: {
      securitySchemes: {
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "better-auth.session_token",
        },
      },
    },
    paths: {
      "/me": {
        get: {
          operationId: "getMe",
          summary: "Current user",
          responses: {
            "200": { description: "Current user", ...json(data(me)) },
            ...errors(401),
          },
        },
        patch: {
          operationId: "patchMe",
          summary: "Update profile",
          requestBody: { required: true, ...json(patchMeSchema) },
          responses: {
            "200": { description: "Updated user", ...json(data(me)) },
            ...errors(400, 401, 404),
          },
        },
      },
      "/users": {
        get: {
          operationId: "searchUsers",
          summary: "Search users",
          requestParams: { query: userSearchQuerySchema },
          responses: {
            "200": {
              description: "Matching users",
              ...json(data(z.object({ items: z.array(publicUser) }))),
            },
            ...errors(400, 401, 429),
          },
        },
      },
      "/users/{userId}": {
        get: {
          operationId: "getUser",
          summary: "Public profile",
          requestParams: { path: userPath },
          responses: {
            "200": { description: "Public profile", ...json(data(publicUser)) },
            ...errors(401, 404),
          },
        },
      },
      "/conversations": {
        get: {
          operationId: "listConversations",
          summary: "List conversations",
          requestParams: { query: listQuerySchema },
          responses: {
            "200": {
              description: "Conversation page",
              ...json(
                data(
                  z.object({
                    items: z.array(conversationSummary),
                    nextCursor: z.string().nullable(),
                  }),
                ),
              ),
            },
            ...errors(400, 401),
          },
        },
        post: {
          operationId: "createConversation",
          summary: "Create conversation",
          requestBody: { required: true, ...json(createConversationSchema) },
          responses: {
            "200": {
              description: "Existing direct conversation",
              ...json(data(z.object({ conversationId: id, created: z.boolean().optional() }))),
            },
            "201": {
              description: "Created conversation",
              ...json(data(z.object({ conversationId: id, created: z.boolean().optional() }))),
            },
            ...errors(400, 401, 404),
          },
        },
      },
      "/conversations/{conversationId}": {
        get: {
          operationId: "getConversation",
          summary: "Conversation detail",
          requestParams: { path: convPath },
          responses: {
            "200": { description: "Conversation detail", ...json(data(conversationDetail)) },
            ...errors(401, 403, 404),
          },
        },
        patch: {
          operationId: "renameConversation",
          summary: "Rename group",
          requestParams: { path: convPath },
          requestBody: { required: true, ...json(renameConversationSchema) },
          responses: {
            "200": { description: "Renamed conversation", ...json(data(conversationDetail)) },
            ...errors(400, 401, 403, 404),
          },
        },
      },
      "/conversations/{conversationId}/members": {
        post: {
          operationId: "addMember",
          summary: "Add member",
          requestParams: { path: convPath },
          requestBody: { required: true, ...json(addMemberSchema) },
          responses: {
            "201": { description: "Member added", ...json(data(z.object({ userId: id }))) },
            ...errors(400, 401, 403, 404, 409),
          },
        },
      },
      "/conversations/{conversationId}/members/me": {
        delete: {
          operationId: "leaveConversation",
          summary: "Leave conversation",
          requestParams: { path: convPath },
          responses: {
            "200": {
              description: "Left conversation",
              ...json(data(z.object({ ok: z.literal(true) }))),
            },
            ...errors(401, 404),
          },
        },
      },
      "/conversations/{conversationId}/read": {
        post: {
          operationId: "markRead",
          summary: "Mark read",
          requestParams: { path: convPath },
          requestBody: { required: true, ...json(markReadSchema) },
          responses: {
            "200": {
              description: "Read marker updated",
              ...json(data(z.object({ ok: z.literal(true) }))),
            },
            ...errors(400, 401, 403, 404),
          },
        },
      },
      "/conversations/{conversationId}/messages": {
        get: {
          operationId: "listMessages",
          summary: "List messages",
          requestParams: { path: convPath, query: listMessagesQuery },
          responses: {
            "200": {
              description: "Message page (newest first)",
              ...json(
                data(z.object({ items: z.array(messageDto), nextCursor: z.string().nullable() })),
              ),
            },
            ...errors(400, 401, 403, 404),
          },
        },
        post: {
          operationId: "sendMessage",
          summary: "Send message",
          requestParams: { path: convPath },
          requestBody: { required: true, ...json(sendMessageSchema) },
          responses: {
            "200": { description: "Idempotent replay", ...json(data(messageDto)) },
            "201": { description: "Message sent", ...json(data(messageDto)) },
            ...errors(400, 401, 403, 404, 409, 429),
          },
        },
      },
      "/messages/{messageId}": {
        patch: {
          operationId: "editMessage",
          summary: "Edit message",
          requestParams: { path: msgPath },
          requestBody: { required: true, ...json(editMessageSchema) },
          responses: {
            "200": { description: "Edited message", ...json(data(messageDto)) },
            ...errors(400, 401, 403, 404, 410),
          },
        },
        delete: {
          operationId: "deleteMessage",
          summary: "Delete message",
          requestParams: { path: msgPath },
          responses: {
            "200": { description: "Deleted message", ...json(data(messageDto)) },
            ...errors(401, 403, 404, 410),
          },
        },
      },
    },
  });
}
