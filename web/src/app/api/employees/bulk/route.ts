import { revalidatePath } from "next/cache";
import {
  employeeCsvColumns,
  encodeCsv,
  EmployeeCsvError,
} from "@/features/employees/domain/employee-csv";
import {
  employeeBulkHttp,
  readEmployeeImportBody,
  csvDownload,
} from "@/features/employees/http/bulk-handler";
import {
  processEmployeeImport,
  exportEmployeeDirectoryCsv,
} from "@/features/employees/server/employee-import-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return employeeBulkHttp(request, async () => {
    const { csv, mode } = await readEmployeeImportBody(request);
    const result = await processEmployeeImport(csv, mode);
    if (result.rows.some((row) => row.status === "created"))
      revalidatePath("/admin/colaboradores");
    return result;
  });
}

export async function GET(request: Request) {
  return employeeBulkHttp(request, async () => {
    const download = new URL(request.url).searchParams.get("download");
    if (download === "template")
      return csvDownload(
        encodeCsv([employeeCsvColumns]),
        "plantilla-colaboradores.csv",
      );
    if (download !== "directory")
      throw new EmployeeCsvError("Elegí descargar la plantilla o el directorio.");
    return csvDownload(await exportEmployeeDirectoryCsv(), "colaboradores.csv");
  });
}
