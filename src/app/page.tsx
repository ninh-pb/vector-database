'use client';

import { useState } from 'react';

export default function Home() {
  const [id, setId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [comments, setComments] = useState<string[]>([]);

  const getComment = async () => {
    const res = await fetch(`/api/comments?id=${id}`, {
      method: 'GET',
    });

    const data = await res.json();
    if (data && data.length) setComments(data);
  };

  const searchComment = async () => {
    const res = await fetch(`/api/searchs?keyword=${keyword}`, {
      method: 'GET',
    });

    const data = await res.json();
    if (data && data.length) setComments(data);
  };

  return (
    <main className='flex min-h-screen flex-col items-center justify-between p-24'>
      <div>
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          type='text'
          placeholder='video id'
          className='text-black'
        />
        <button onClick={getComment}>Get comment</button>
      </div>
      <div>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          type='text'
          placeholder='key word'
          className='text-black'
        />
        <button onClick={searchComment}>Search comment</button>
      </div>
      {comments && comments.length > 0 && (
        <ul>
          {comments.map((comment) => (
            <li>{comment}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
