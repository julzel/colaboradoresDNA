import "server-only";

import { PlanningService } from "../application/planning-service";
import { createOpenAIPlanningModel } from "./openai-planning-model";
import { planningRepository } from "./planning-repository";

export function getPlanningService() {
  return new PlanningService(planningRepository, createOpenAIPlanningModel());
}
