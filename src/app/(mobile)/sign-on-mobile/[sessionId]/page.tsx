import MobileSignClient from "./MobileSignClient";


export default async function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const resolved = await params;
  return <MobileSignClient sessionId={resolved.sessionId} />;
}
