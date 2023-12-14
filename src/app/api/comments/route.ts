import { HfInference } from '@huggingface/inference';
import { google } from 'googleapis';
import weaviate, { WeaviateClient } from 'weaviate-ts-client';

const HF_WRITE_TOKEN = process.env.HF_WRITE_TOKEN2 || '';
const MODEL = process.env.EMBEDDING_MODEL || '';

const hf = new HfInference(HF_WRITE_TOKEN);
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

const client: WeaviateClient = weaviate.client({
  scheme: 'http',
  host: 'localhost:8080',
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');
  let result: any = null;

  if (!keyword) {
    return new Response(JSON.stringify(result));
  }

  const res = await client.graphql
    .get()
    .withClassName('Comment')
    .withFields('content')
    .withNearText({
      concepts: [keyword],
      distance: 0.9,
    })
    .withLimit(5)
    .do();

  return new Response(JSON.stringify(res.data.Get.Comment));
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const comments: string[] = [];

  if (!id || id === '') return new Response(JSON.stringify(comments));
  const res = await youtube.commentThreads.list({
    part: ['snippet'],
    videoId: id,
    maxResults: 100,
  });

  if (!res || !res.data) return new Response(JSON.stringify(comments));

  if (res.data.items) {
    const promises = res.data.items.map(async (item) => {
      const content = item.snippet?.topLevelComment?.snippet?.textOriginal;
      if (!content) return;

      comments.push(content);

      // const vector = await hf.featureExtraction({
      //   model: MODEL,
      //   inputs: content,
      // });

      // if (!vector) return;
      // console.log(
      //   '🚀 ~ file: route.ts:83 ~ res.data.items.forEach ~ vector:',
      //   vector
      // );

      await client.data
        .creator()
        .withClassName('Comment')
        .withProperties({
          content,
          vector: Buffer.from(JSON.stringify(content)).toString('base64'),
        })
        .do();
    });

    await Promise.all(promises);
  }

  return new Response(JSON.stringify(comments));
}
