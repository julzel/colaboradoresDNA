import { redirect } from "next/navigation";

export default async function LegacyEditSchedulePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  redirect(`/admin/horarios/${employeeId}`);
}
