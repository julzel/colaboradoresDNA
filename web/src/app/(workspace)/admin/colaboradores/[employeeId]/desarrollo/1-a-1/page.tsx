import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container/container";
import { DevelopmentRecord } from "@/features/development/components/development-record";
import { DevelopmentDomainError } from "@/features/development/domain/shared";
import { getDevelopmentRecordForAdministration } from "@/features/development/server/development-service";

export const metadata: Metadata = { title: "Reuniones 1:1" };

async function loadDevelopmentRecord(employeeId: string) {
  try {
    return await getDevelopmentRecordForAdministration(employeeId);
  } catch (error) {
    if (
      error instanceof DevelopmentDomainError &&
      (error.code === "employee_not_found" || error.code === "record_not_found")
    ) {
      notFound();
    }
    throw error;
  }
}

export default async function OneOnOneTimelinePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const record = await loadDevelopmentRecord(employeeId);
  return (
    <Container>
      <DevelopmentRecord currentSection="one_on_one" {...record} />
    </Container>
  );
}
