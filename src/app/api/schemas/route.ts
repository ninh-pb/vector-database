import weaviate, { WeaviateClient } from 'weaviate-ts-client';

const client: WeaviateClient = weaviate.client({
  scheme: 'http',
  host: 'localhost:8080',
});

const commentSchemaConfig = {
  class: 'Comment',
  vectorizer: 'text2vec-transformers',
  properties: [
    {
      name: 'content',
      dataType: ['string'],
    },
    {
      name: 'vector',
      dataType: ['blob'],
      moduleConfig: {
        'text2vec-transformers': {
          skip: false,
          vectorizePropertyName: false,
        },
      },
    },
  ],
};

const imageSchemaConfig = {
  class: 'Image',
  vectorizer: 'img2vec-neural',
  vectorIndexType: 'hnsw',
  moduleConfig: {
    'img2vec-neural': {
      imageFields: ['image'],
    },
  },
  properties: [
    {
      name: 'description',
      dataType: ['string'],
    },
    {
      name: 'image',
      dataType: ['blob'],
    },
  ],
};

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.schema) return new Response(JSON.stringify(false));

  const schemaConfig =
    body.schema === 'Comment' ? commentSchemaConfig : imageSchemaConfig;
  await client.schema.classCreator().withClass(schemaConfig).do();
  return new Response(JSON.stringify(true));
}

export async function GET(request: Request) {
  const res = await client.schema.getter().do();
  return new Response(JSON.stringify(res));
}

export async function DELETE(request: Request) {
  const body = await request.json();

  if (!body.className || !['Comment', 'Image'].includes(body.className))
    return new Response(JSON.stringify(false));

  await client.schema.classDeleter().withClassName(body.className).do();
  return new Response(JSON.stringify(true));
}
