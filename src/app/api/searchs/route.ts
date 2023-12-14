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
  const keyword = searchParams.get('keyword');
  const comments: string[] = [];

  if (!keyword || keyword === '') return new Response(JSON.stringify(comments));

  const db = await getSingleStoreConnection();
  const conn = await db.getConnection();

  const vector = await hf.featureExtraction({
    model: MODEL,
    inputs: keyword,
  });

  if (!vector) return;

  const result: any = await getSSComment({ conn, vector });

  if (result && result.length) {
    return new Response(JSON.stringify(result.map((r: any) => r.content)));
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

const getSSComment = async ({
  conn,
  vector,
}: {
  conn: mysql.Connection;
  vector: any;
}) => {
  const [results] = await conn.execute<ResultSetHeader[]>(
    'SELECT content, dot_product(vector, JSON_ARRAY_PACK(?)) as score from comments order by score desc limit 5',
    [JSON.stringify(vector)]
  );
  return results;
};
