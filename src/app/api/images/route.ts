import weaviate, { WeaviateClient } from 'weaviate-ts-client';
import { promises as fs } from 'fs';

const client: WeaviateClient = weaviate.client({
  scheme: 'http',
  host: 'localhost:8080',
});

const IMG_DIR = './public/img';
const SEARCH_IMG_DIR = './public/searchImg';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get('fileName');

  if (!fileName) return new Response('null');

  const file = await fs.readFile(`${IMG_DIR}/${fileName}`);

  if (!file) return new Response('null');

  const imgBuffer = Buffer.from(file).toString('base64');

  const res = await client.graphql
    .get()
    .withClassName('Image')
    .withFields('image text')
    .withNearImage({ image: imgBuffer, distance: 0.5 })
    .withLimit(2)
    .do();

  const images = res.data.Get.Image;
  if (!images.length) return new Response('null');

  const fileNames = [];

  for (let i = 0; i < images.length; i++) {
    fileNames.push(images[i].text);
    await fs.writeFile(
      `${SEARCH_IMG_DIR}/${images[i].text}`,
      images[i].image,
      'base64'
    );
  }

  return new Response(JSON.stringify(fileNames));
}

export async function POST() {
  const imgFiles = await fs.readdir(IMG_DIR);

  const promises = imgFiles.map(async (file) => {
    const base64Img = await fs.readFile(`${IMG_DIR}/${file}`, {
      encoding: 'base64',
    });

    await client.data
      .creator()
      .withClassName('Image')
      .withProperties({
        image: base64Img,
        text: file,
      })
      .do();
  });

  await Promise.all(promises);
  return new Response(JSON.stringify(imgFiles));
}
