import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TaskAssigneeField } from "@/features/production-tasks/components/task-assignee-field";

describe("task assignee name search", () => {
  it("searches accents and multiple name parts, and emits the selected employee ID", async () => {
    const onChange = vi.fn(
      (event: React.ChangeEvent<HTMLSelectElement>) => event.target.value,
    );
    render(
      <TaskAssigneeField
        id="person"
        label="Encargado"
        value=""
        onChange={onChange}
        employees={[
          { id: "ana", displayName: "Ana María Solís", employeeCode: "DNA-0001" },
          { id: "luis", displayName: "Luis Mora", employeeCode: "DNA-0002" },
        ]}
      />,
    );
    await userEvent.type(screen.getByRole("searchbox"), "solis ana");
    expect(screen.queryByRole("option", { name: /Luis/ })).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole("combobox"), "ana");
    expect(onChange).toHaveBeenCalled();
    expect(onChange).toHaveReturnedWith("ana");
    await userEvent.clear(screen.getByRole("searchbox"));
    await userEvent.type(screen.getByRole("searchbox"), "missing");
    expect(screen.getByRole("status")).toHaveTextContent(
      "No encontramos colaboradores",
    );
  });
});
