import MobileSignClient from "./MobileSignClient";

export const dynamic = "force-dynamic";

export default function Page({ params }: { params: { sessionId: string } }) {
  return <MobileSignClient sessionId={params.sessionId} />;
}
