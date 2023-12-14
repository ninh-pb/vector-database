import { HfInference } from '@huggingface/inference';

const HF_WRITE_TOKEN = process.env.HF_WRITE_TOKEN2 || '';
const MODEL = process.env.EMBEDDING_MODEL || '';

const hf = new HfInference(HF_WRITE_TOKEN);

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.keyword) return new Response('nothing to show');

  const vector = await hf.featureExtraction({
    model: MODEL,
    inputs: body.keyword,
  });

  return new Response(JSON.stringify(vector));
}
