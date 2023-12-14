import { google } from 'googleapis';
import { HfInference } from '@huggingface/inference';
import mysql, { ResultSetHeader } from 'mysql2/promise';

const HF_READ_TOKEN = process.env.HF_READ_TOKEN2 || '';
const HF_WRITE_TOKEN = process.env.HF_WRITE_TOKEN2 || '';
const HOST = process.env.SINGLE_STORE_HOST;
const USER = 'admin';
const PASSWORD = process.env.SINGLE_STORE_PASSWORD;
const DATABASE = 'vectordatabase2';
const MODEL = process.env.EMBEDDING_MODEL || '';

const hf = new HfInference(HF_WRITE_TOKEN);
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

export async function GET(request: Request) {
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

  const db = await getSingleStoreConnection();
  const conn = await db.getConnection();

  if (res.data.items) {
    res.data.items.forEach(async (item) => {
      const content = item.snippet?.topLevelComment?.snippet?.textOriginal;
      if (!content) return;

      const vector = await hf.featureExtraction({
        model: MODEL,
        inputs: content,
      });

      if (!vector) return;

      await createSSComment({ conn, content, vector });
    });
  }

  return new Response(JSON.stringify(comments));
}

const getSingleStoreConnection = async () => {
  let singleStoreConnection;
  try {
    singleStoreConnection = mysql.createPool({
      host: HOST,
      user: USER,
      password: PASSWORD,
      database: DATABASE,
      waitForConnections: true,
      connectionLimit: 100,
      queueLimit: 0,
    });

    console.log('You have successfully connected to SingleStore.');
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }

  return singleStoreConnection;
};

const createSSComment = async ({
  conn,
  content,
  vector,
}: {
  conn: mysql.Connection;
  content: string;
  vector: any;
}) => {
  const [results] = await conn.execute<ResultSetHeader>(
    'INSERT INTO comments VALUES (?, JSON_ARRAY_PACK(?))',
    [JSON.stringify(content), JSON.stringify(vector)]
  );
  return results.insertId;
};
