"use client";

import { toast } from "sonner";

import {
  feedbackMessages,
  type FeedbackMessageKey,
} from "@/lib/actions/feedback-messages";

const durations = {
  error: Infinity,
  info: 5000,
  success: 4000,
  warning: 8000,
} as const;

export function showFeedbackToast(messageKey: FeedbackMessageKey) {
  const feedback = feedbackMessages[messageKey];

  return toast[feedback.tone](feedback.message, {
    duration: durations[feedback.tone],
    id: messageKey,
  });
}
