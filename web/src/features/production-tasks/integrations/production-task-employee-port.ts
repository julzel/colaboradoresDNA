export type ProductionTaskEmployee = {
  displayName: string;
  email: string;
  employeeCode: string | null;
  employeeId: string;
  platformRole: "administrator" | "supervisor" | "collaborator";
  platformUserId: string;
};

export type ProductionTaskEmployeePort = {
  listEmployeeLabels(
    employeeIds: string[],
  ): Promise<Array<{ id: string; displayName: string; employeeCode: string | null }>>;
  isProductionEmployee(platformUserId: string, onDate: string): Promise<boolean>;
  findActiveEmployeeByPlatformUserId(
    platformUserId: string,
  ): Promise<ProductionTaskEmployee | null>;
  listActiveEmployees(): Promise<ProductionTaskEmployee[]>;
};
