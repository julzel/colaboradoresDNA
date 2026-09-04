import type {
  PlatformRole,
  PlatformUserStatus,
} from "@/features/auth/domain/platform-user";
import type { EmployeeAssignment } from "@/features/employees/domain/assignment";
import type {
  EmploymentStatus,
  IdentificationType,
} from "@/features/employees/domain/employee";
import type {
  EmployeeSchedule,
  ScheduledDay,
} from "@/features/employees/domain/schedule";

export type EmployeeDirectoryItem = {
  accessStatus: PlatformUserStatus;
  departmentName: string | null;
  displayName: string;
  employeeCode: string | null;
  employmentStartedOn: string;
  employmentStatus: EmploymentStatus;
  id: string;
  managerName: string | null;
  platformRole: PlatformRole;
  positionTitle: string | null;
};

export type EmployeeDirectoryResult = {
  items: EmployeeDirectoryItem[];
  page: number;
  pageCount: number;
  total: number;
};

export type EmployeeManagerOption = {
  displayName: string;
  id: string;
};

export type EmployeeSelfServiceProfileDetail = {
  access: {
    email: string;
    role: PlatformRole;
    status: PlatformUserStatus;
  };
  currentAssignment: {
    departmentName: string;
    managerName: string | null;
    positionTitle: string;
  } | null;
  currentSchedule: { days: ScheduledDay[] } | null;
  employee: {
    birthday: string;
    canonicalDisplayName: string;
    displayName: string;
    employeeCode: string | null;
    employmentEndedOn: string | null;
    employmentStartedOn: string;
    employmentStatus: EmploymentStatus;
    identification: {
      maskedValue: string;
      type: IdentificationType;
    };
    initials: string;
    phoneDisplayValue: string | null;
    preferredName: string | null;
    shareBirthdayOnCalendar: boolean;
  };
};

export type EmployeeDetail = {
  access: {
    clerkUserId: string | null;
    email: string;
    hasInvitationBeenSent: boolean;
    invitationStatus: "pending" | "accepted" | "failed";
    role: PlatformRole;
    status: PlatformUserStatus;
  };
  assignmentHistory: Array<
    EmployeeAssignment & {
      departmentName: string;
      managerName: string | null;
    }
  >;
  currentAssignment: {
    departmentId: string;
    departmentName: string;
    managerEmployeeId: string | null;
    managerName: string | null;
    positionTitle: string;
  } | null;
  currentSchedule: EmployeeSchedule | null;
  employee: {
    birthday: string;
    employmentEndedOn: string | null;
    employmentStartedOn: string;
    employmentStatus: EmploymentStatus;
    employeeCode: string | null;
    firstSurname: string;
    givenNames: string;
    id: string;
    identification: {
      maskedValue: string;
      type: IdentificationType;
    };
    initials: string;
    phoneDisplayValue: string | null;
    preferredName: string | null;
    secondSurname: string | null;
    shareBirthdayOnCalendar: boolean;
  };
  scheduleHistory: EmployeeSchedule[];
};
