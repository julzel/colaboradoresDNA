import { notFound } from "next/navigation";

import { Modal } from "@/components/ui/modal/modal";
import { PtoRequestDetailContent } from "@/features/pto/components/pto-request-detail-content";
import { getPtoRequestDetail } from "@/features/pto/server/pto-service";

export default async function PtoRequestDetailModal({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const detail = await getPtoRequestDetail(requestId);
  if (!detail) notFound();

  return (
    <Modal
      title="Detalle de solicitud"
    >
      <PtoRequestDetailContent detail={detail} presentation="modal" />
    </Modal>
  );
}
