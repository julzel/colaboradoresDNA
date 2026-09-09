import { beforeEach, describe, expect, it, vi } from "vitest";
import { markNotificationReadAction } from "@/features/dashboard/actions/dashboard-notification-actions";
const read = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/features/calendar/server/calendar-service", () => ({
  readDashboardNotification: read,
  readAllDashboardNotifications: vi.fn(),
  getCalendarDashboardNotifications: vi.fn(),
}));
describe("notification read actions", () => {
  beforeEach(() => {
    read.mockReset();
  });
  it.each([
    "event:507f1f77bcf86cd799439011",
    "leave:507f1f77bcf86cd799439011:12:cancelled",
  ])("accepts a valid event/transition key %s", async (key) => {
    read.mockResolvedValue("/ausencias/507f1f77bcf86cd799439011");
    await expect(markNotificationReadAction(key)).resolves.toEqual({
      href: "/ausencias/507f1f77bcf86cd799439011",
    });
    expect(read).toHaveBeenCalledWith(key);
  });
  it("rejects malformed keys before looking up a recipient", async () => {
    await expect(
      markNotificationReadAction("https://untrusted.example"),
    ).rejects.toThrow();
    expect(read).not.toHaveBeenCalled();
  });
  it("does not return a destination for an inaccessible notification", async () => {
    read.mockResolvedValue(null);
    await expect(
      markNotificationReadAction("event:507f1f77bcf86cd799439011"),
    ).rejects.toThrow("Notification unavailable");
  });
});
