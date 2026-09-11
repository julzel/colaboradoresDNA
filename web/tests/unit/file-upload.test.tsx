import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FileUpload } from "@/components/ui/file-upload/file-upload";

describe("FileUpload", () => {
  it("shows the chosen file and forwards the input ref and change event", async () => {
    const ref = createRef<HTMLInputElement>();
    const onChange = vi.fn();
    render(
      <FileUpload
        accept=".csv"
        id="file"
        label="Archivo CSV"
        onChange={onChange}
        ref={ref}
      />,
    );

    expect(screen.getByText("Ningún archivo seleccionado")).toBeInTheDocument();
    await userEvent.upload(
      screen.getByLabelText("Archivo CSV"),
      new File(["data"], "colaboradores.csv", { type: "text/csv" }),
    );
    expect(screen.getByText("colaboradores.csv")).toBeInTheDocument();
    expect(ref.current?.files?.[0]?.name).toBe("colaboradores.csv");
    expect(onChange).toHaveBeenCalledOnce();
  });
});
