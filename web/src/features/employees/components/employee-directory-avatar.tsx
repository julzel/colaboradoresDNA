import { getDisplayNameInitials } from "@/features/employees/domain/employee";

import styles from "./employee-management.module.css";

export function EmployeeDirectoryAvatar({
  displayName,
  profileImageUrl,
}: {
  displayName: string;
  profileImageUrl: string | null;
}) {
  return (
    <span aria-hidden="true" className={styles.directoryAvatar}>
      {profileImageUrl ? (
        // Clerk serves the user-selected image URL and already provides optimized variants.
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" src={profileImageUrl} />
      ) : (
        getDisplayNameInitials(displayName)
      )}
    </span>
  );
}
