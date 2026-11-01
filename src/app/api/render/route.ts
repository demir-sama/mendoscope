import { experimental_generateImage as generateImage, gateway } from "ai";
import { IMAGE_MODEL } from "@/lib/schema";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const { image } = await generateImage({
      model: gateway.imageModel(IMAGE_MODEL),
      prompt: `${String(prompt).slice(0, 1200)} Photorealistic smartphone photo, natural light, no text.`,
      aspectRatio: "4:3",
    });
    return Response.json({ image: `data:${image.mediaType};base64,${image.base64}` });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : "Render failed" }, { status: 500 });
  }
}
