export type ProductionTaskEmployee = {
  displayName: string;
  email: string;
  employeeCode: string | null;
  employeeId: string;
  platformRole: "administrator" | "supervisor" | "collaborator";
  platformUserId: string;
};

export type ProductionTaskEmployeePort = {
  findActiveEmployeeByPlatformUserId(
    platformUserId: string,
  ): Promise<ProductionTaskEmployee | null>;
  listActiveEmployees(): Promise<ProductionTaskEmployee[]>;
};
