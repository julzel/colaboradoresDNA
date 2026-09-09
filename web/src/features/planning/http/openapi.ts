import { z } from "zod";
import {
  acceptRequestSchema,
  bootstrapSchema,
  companyContextSchema,
  generateRequestSchema,
  saveContextRequestSchema,
  updateTaskRequestSchema,
  workspaceSchema,
} from "../domain/contracts";

const schemas = {
  Bootstrap: bootstrapSchema,
  Workspace: workspaceSchema,
  CompanyContext: companyContextSchema,
  GenerateRequest: generateRequestSchema,
  AcceptRequest: acceptRequestSchema,
  SaveContextRequest: saveContextRequestSchema,
  UpdateTaskRequest: updateTaskRequestSchema,
};

const toSchema = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { target: "draft-2020-12" });
const jsonSchemas = Object.fromEntries(
  Object.entries(schemas).map(([name, schema]) => [name, toSchema(schema)]),
) as Record<keyof typeof schemas, ReturnType<typeof toSchema>>;

function operation(summary: string, response: string, input?: string) {
  return {
    summary,
    ...(input
      ? {
          description:
            "Requires an Origin header equal to APP_BASE_URL and the current resource version. Stale versions return 409. JSON bodies are limited to 256000 bytes.",
          parameters: [
            {
              name: "Origin",
              in: "header",
              required: true,
              schema: { type: "string", format: "uri" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: { $ref: `#/components/schemas/${input}` } },
            },
          },
        }
      : {}),
    responses: {
      "200": {
        description: "Success",
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["data"],
              properties: { data: { $ref: `#/components/schemas/${response}` } },
            },
          },
        },
      },
      ...Object.fromEntries(
        [400, 401, 403, 404, 409, 413, 415, 422, 429, 500, 502, 503].map((status) => [
          String(status),
          {
            description: "Validation, access, concurrency, quota, or service error",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        ]),
      ),
    },
  };
}

// Generated from the same Zod schemas the API and typed client validate.
export const planningOpenApi = {
  openapi: "3.1.0",
  info: {
    title: "DNAture Personal Planning API",
    version: "1.0.0",
    description:
      "Administrator-only personal planning. Ownership is derived from the authenticated platform user; clients cannot choose another owner. Context is shared by administrators. Responses are private and non-cacheable.",
  },
  servers: [{ url: "/api/planning/v1" }],
  security: [{ applicationSession: [] }],
  paths: {
    "/workspace": {
      get: operation(
        "Load the caller's workspace and current company context",
        "Bootstrap",
      ),
    },
    "/context": {
      put: operation(
        "Replace reviewed company references using optimistic concurrency",
        "CompanyContext",
        "SaveContextRequest",
      ),
    },
    "/proposals": {
      post: {
        ...operation(
          "Generate or revise a proposal without changing the accepted plan",
          "Workspace",
          "GenerateRequest",
        ),
        description:
          "Requires same-origin Origin header. Synchronous generation can take up to 120 seconds. At most 50 attempts per user per UTC day and one per 10 seconds. Each attempt reserves a workspace version; reload after a failed attempt. Existing task IDs and progress are retained. Missing context yields a provisional plan.",
      },
    },
    "/plan": {
      put: operation(
        "Accept an existing proposal and optional task edits or ordering",
        "Workspace",
        "AcceptRequest",
      ),
    },
    "/tasks/{taskId}": {
      parameters: [
        { name: "taskId", in: "path", required: true, schema: { type: "string" } },
      ],
      patch: {
        ...operation(
          "Update task progress in the accepted plan",
          "Workspace",
          "UpdateTaskRequest",
        ),
        description:
          "Requires same-origin Origin header. Blocked tasks require a blocker. Starting a task requires completed dependencies. Updating progress invalidates any pending proposal.",
      },
    },
  },
  components: {
    securitySchemes: {
      applicationSession: {
        type: "apiKey",
        in: "cookie",
        name: "__Secure-better-auth.session_token",
        description:
          "Existing Better Auth session, active invited platform account, administrator role and MFA required.",
      },
    },
    schemas: {
      ...jsonSchemas,
      Error: z.toJSONSchema(
        z.object({
          error: z.object({
            code: z.string(),
            message: z.string(),
            fields: z.array(z.string()).optional(),
          }),
        }),
      ),
    },
  },
};
