export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ directMetaApi: !!process.env.MODEL_API_KEY, image: process.env.MENDO_IMAGE === "on" });
}
