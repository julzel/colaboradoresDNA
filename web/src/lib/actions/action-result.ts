import type { FeedbackMessageKey } from "@/lib/actions/feedback-messages";

export type ActionResult<Data = undefined> =
  | {
      data?: Data;
      messageKey: FeedbackMessageKey;
      ok: true;
    }
  | {
      fieldErrors?: Record<string, readonly string[]>;
      messageKey: FeedbackMessageKey;
      ok: false;
    };
