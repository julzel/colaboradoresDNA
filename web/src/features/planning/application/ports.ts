import type {
  CompanyContext,
  GenerateRequest,
  PlanOutput,
  Workspace,
} from "../domain/contracts";

export type PlanningActor = { id: string; role: string };
export type StoredWorkspace = Workspace & {
  generationCount: number;
  generationDay: string;
  lastGenerationAt: string | null;
};
export interface PlanningRepository {
  getWorkspace(ownerId: string): Promise<StoredWorkspace>;
  saveWorkspace(
    ownerId: string,
    expectedVersion: number,
    workspace: StoredWorkspace,
  ): Promise<StoredWorkspace>;
  getContext(): Promise<CompanyContext>;
  saveContext(
    expectedVersion: number,
    context: CompanyContext,
  ): Promise<CompanyContext>;
}
export interface PlanningModel {
  readonly name: string;
  readonly configured: boolean;
  generate(input: {
    request: GenerateRequest;
    workspace: Workspace;
    context: CompanyContext;
    today: string;
  }): Promise<{
    plan: PlanOutput;
    usage: { inputTokens: number; outputTokens: number };
  }>;
}
