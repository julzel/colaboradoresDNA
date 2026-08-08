import "server-only";

import type { Db, IndexDescription } from "mongodb";

export const developmentIndexDefinitions = {
  development_audit: [
    {
      key: { employeeId: 1, createdAt: -1 },
      name: "development_audit_employee_timeline",
      partialFilterExpression: { employeeId: { $type: "objectId" } },
    },
    {
      key: { resourceType: 1, resourceId: 1, createdAt: -1 },
      name: "development_audit_resource_timeline",
    },
    {
      key: { actorPlatformUserId: 1, createdAt: -1 },
      name: "development_audit_actor_timeline",
    },
  ],
  development_goal_updates: [
    {
      key: { goalId: 1, occurredAt: -1 },
      name: "development_goal_updates_timeline",
    },
  ],
  development_goals: [
    {
      key: { employeeId: 1, status: 1, targetDate: 1 },
      name: "development_goals_employee_status_due",
    },
    {
      key: { linkedSkillIds: 1, status: 1, targetDate: 1 },
      name: "development_goals_linked_skills",
    },
  ],
  development_one_on_ones: [
    {
      key: { employeeId: 1, occurredOn: -1 },
      name: "development_one_on_ones_employee_timeline",
    },
    {
      key: { authorPlatformUserId: 1, status: 1, updatedAt: -1 },
      name: "development_one_on_ones_draft_owner",
      partialFilterExpression: { status: "draft" },
    },
    {
      key: { employeeId: 1, "actionItems.status": 1, "actionItems.dueOn": 1 },
      name: "development_one_on_ones_open_actions",
    },
    {
      key: { calendarEventId: 1 },
      name: "development_one_on_ones_calendar_event_unique",
      partialFilterExpression: { calendarEventId: { $type: "objectId" } },
      unique: true,
    },
  ],
  development_profiles: [
    {
      key: { employeeId: 1 },
      name: "development_profiles_employee_unique",
      unique: true,
    },
  ],
  development_skills: [
    {
      key: { normalizedName: 1 },
      name: "development_skills_active_name_unique",
      partialFilterExpression: { status: "active" },
      unique: true,
    },
    {
      key: { status: 1, category: 1, name: 1 },
      name: "development_skills_catalog",
    },
  ],
  employee_skill_assessment_history: [
    {
      key: { employeeId: 1, skillId: 1, assessedAt: -1 },
      name: "employee_skill_assessment_history_timeline",
    },
  ],
  employee_skill_assessments: [
    {
      key: { employeeId: 1, skillId: 1 },
      name: "employee_skill_assessments_current_unique",
      unique: true,
    },
    {
      key: { skillId: 1, employeeId: 1 },
      name: "employee_skill_assessments_matrix",
    },
  ],
} as const satisfies Readonly<Record<string, readonly IndexDescription[]>>;

/**
 * Migration/bootstrap helper only. Application repositories intentionally do
 * not call this function so the production runtime principal needs no index
 * administration privileges.
 */
export async function applyDevelopmentIndexesForMigration(database: Db) {
  await Promise.all(
    Object.entries(developmentIndexDefinitions).flatMap(([collectionName, indexes]) =>
      indexes.map((index) =>
        database.collection(collectionName).createIndex(index.key, index),
      ),
    ),
  );
}
