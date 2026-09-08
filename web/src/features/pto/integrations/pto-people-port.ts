export type PtoDisplayNames = {
  employees: Map<string, string>;
  platformUsers: Map<string, string>;
};

export interface PtoPeopleIntegration {
  getDisplayNames(input: {
    employeeIds: string[];
    platformUserIds: string[];
  }): Promise<PtoDisplayNames>;
}
