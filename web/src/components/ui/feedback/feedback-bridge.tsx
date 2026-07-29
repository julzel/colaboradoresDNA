"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { showFeedbackToast } from "@/components/ui/feedback/app-toast";
import { isFeedbackMessageKey } from "@/lib/actions/feedback-messages";

export function FeedbackBridge() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledUrl = useRef("");

  useEffect(() => {
    const notice = searchParams.get("notice");
    const error = searchParams.get("error");
    const signature = `${pathname}?${searchParams.toString()}`;

    if ((!notice && !error) || handledUrl.current === signature) {
      return;
    }

    handledUrl.current = signature;

    if (notice && isFeedbackMessageKey(notice)) {
      showFeedbackToast(notice);
    }

    if (error && isFeedbackMessageKey(error)) {
      showFeedbackToast(error);
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("notice");
    nextParams.delete("error");
    const query = nextParams.toString();

    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}
