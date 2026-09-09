import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatNotificationDate,
  NotificationDrawer,
} from "@/features/dashboard/components/notification-drawer";
const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  read: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("@/features/dashboard/actions/dashboard-notification-actions", () => ({
  getUnreadNotificationsAction: mocks.load,
  markNotificationReadAction: mocks.read,
}));
const item = {
  key: "leave:507f1f77bcf86cd799439011:2:approved",
  id: "507f1f77bcf86cd799439011",
  kind: "pto",
  title: "Vacaciones",
  label: "Ausencia aprobada",
  startDate: "2026-10-05",
  endDate: "2026-10-06",
  startsAt: "2026-09-09T12:00:00Z",
  allDay: true,
  isUnread: true,
  eventType: null,
  href: "/ausencias/507f1f77bcf86cd799439011",
};
describe("notification drawer", () => {
  it("formats notification dates with compact capitalized day names", () => {
    expect(formatNotificationDate("2026-10-03")).toBe("Sab, 3 Oct 2026");
    expect(formatNotificationDate("2026-10-05")).toBe("Lun, 5 Oct 2026");
    expect(formatNotificationDate("2026-10-07")).toBe("Mie, 7 Oct 2026");
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.load.mockResolvedValue([item]);
    mocks.read.mockResolvedValue({ href: item.href });
  });
  it("opens a dialog and restores bell focus after Escape", async () => {
    const user = userEvent.setup();
    render(<NotificationDrawer unreadCount={1} />);
    const bell = screen.getByRole("button", { name: "1 notificaciones sin leer" });
    await user.click(bell);
    expect(await screen.findByText("Vacaciones")).toBeVisible();
    expect(screen.getByRole("dialog", { name: "Notificaciones" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(bell).toHaveFocus();
  });
  it("marks an item read, animates its removal, and excludes it after reopening", async () => {
    const user = userEvent.setup();
    render(<NotificationDrawer unreadCount={1} />);
    await user.click(screen.getByRole("button", { name: "1 notificaciones sin leer" }));
    const mark = await screen.findByRole("button", { name: /Marcar como leída/ });
    const row = mark.closest("li")!;
    await user.click(mark);
    await waitFor(() => expect(row).toHaveAttribute("data-removing", "true"));
    expect(mocks.read).toHaveBeenCalledWith(item.key);
    fireEvent.animationEnd(row);
    expect(screen.queryByText("Vacaciones")).not.toBeInTheDocument();
    expect(screen.getByText("Estás al día")).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    mocks.load.mockResolvedValue([]);
    await user.click(screen.getByRole("button", { name: "1 notificaciones sin leer" }));
    expect(await screen.findByText("Estás al día")).toBeInTheDocument();
  });
  it("marks the notification read before navigating to the trusted detail URL", async () => {
    const user = userEvent.setup();
    render(<NotificationDrawer unreadCount={1} />);
    await user.click(screen.getByRole("button", { name: "1 notificaciones sin leer" }));
    await user.click((await screen.findByText("Vacaciones")).closest("button")!);
    expect(mocks.read).toHaveBeenCalledWith(item.key);
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(item.href));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("keeps the item visible and does not navigate when saving read state fails", async () => {
    mocks.read.mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    render(<NotificationDrawer unreadCount={1} />);
    await user.click(screen.getByRole("button", { name: "1 notificaciones sin leer" }));
    await user.click((await screen.findByText("Vacaciones")).closest("button")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos marcar");
    expect(screen.getByText("Vacaciones")).toBeVisible();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
