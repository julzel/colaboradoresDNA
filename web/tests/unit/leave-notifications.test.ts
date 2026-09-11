import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listLeaveNotifications } from "@/features/pto/server/leave-notifications";

const mocks = vi.hoisted(() => ({ user: vi.fn(), find: vi.fn(), rows: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/server/platform-user-repository", () => ({
  findPlatformUserById: mocks.user,
}));
vi.mock("@/lib/server/mongodb", () => ({
  getDatabase: async () => ({ collection: () => ({ find: mocks.find }) }),
}));
const requester = new ObjectId();
const manager = new ObjectId();
const admin = new ObjectId();
const requestId = new ObjectId();

describe("leave manager notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.find.mockReturnValue({
      sort: () => ({ limit: () => ({ toArray: mocks.rows }) }),
    });
  });

  it.each(["approved", "denied"])(
    "notifies both requester and assigned supervisor of %s",
    async (status) => {
      mocks.rows.mockResolvedValue([
        {
          _id: requestId,
          requesterPlatformUserId: requester,
          assignedApproverPlatformUserId: manager,
          category: "vacation",
          startDate: "2026-10-05",
          endDate: "2026-10-06",
          status,
          statusHistory: [
            {
              to: "pending",
              actorPlatformUserId: requester,
              occurredAt: new Date("2026-09-11T12:00:00Z"),
            },
            {
              to: status,
              actorPlatformUserId: admin,
              occurredAt: new Date("2026-09-11T13:00:00Z"),
            },
          ],
        },
      ]);
      mocks.user.mockResolvedValue({ role: "supervisor", status: "active" });
      const managerFeed = await listLeaveNotifications(manager.toHexString());
      expect(managerFeed.map((item) => item.key)).toEqual([
        `leave:${requestId}:1:${status}`,
        `leave:${requestId}:0:pending`,
      ]);
      expect(managerFeed[0]?.href).toBe(`/ausencias/${requestId}`);
      expect(mocks.find).toHaveBeenCalledWith({
        $or: [
          { requesterPlatformUserId: manager },
          { assignedApproverPlatformUserId: manager },
        ],
        status: { $ne: "draft" },
      });
      mocks.user.mockResolvedValue({ role: "collaborator", status: "active" });
      expect(
        (await listLeaveNotifications(requester.toHexString())).map((item) => item.key),
      ).toEqual([`leave:${requestId}:1:${status}`]);
      mocks.user.mockResolvedValue({ role: "administrator", status: "active" });
      expect(
        (await listLeaveNotifications(admin.toHexString())).map((item) => item.key),
      ).toEqual([`leave:${requestId}:0:pending`]);
    },
  );

  it("does not notify inactive accounts", async () => {
    mocks.user.mockResolvedValue({ role: "supervisor", status: "deactivated" });
    expect(await listLeaveNotifications(manager.toHexString())).toEqual([]);
    expect(mocks.find).not.toHaveBeenCalled();
  });
});
