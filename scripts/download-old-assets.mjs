import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ProxyAgent, fetch } from 'undici';

const baseUrl = 'https://raw.githubusercontent.com/CPeace-creator/picGo/main/';
const proxyUrl = process.env.OLD_BLOG_PROXY;
const dispatcher = proxyUrl
  ? new ProxyAgent({ uri: proxyUrl, requestTls: { rejectUnauthorized: false } })
  : undefined;

const assets = {
  'course-sea': [
    '202503232059579.png',
    '202503232059949.png',
    '202503232100740.png',
    '202503232100803.png',
    '20250323210505.png',
    '202503232105282.png',
  ],
  'epr-logistics': ['20250316153125.png'],
  'uni-push': [
    'raffle-pic.jpg',
    '20250308180107.png',
    '20250308180505.png',
    '20250308180555.png',
    '20250308180620.png',
    '20250308180646.png',
    '20250308180709.png',
    '20250308180739.png',
  ],
};

async function download(folder, name) {
  const targetDirectory = path.resolve('src/assets/images/posts', folder);
  const target = path.join(targetDirectory, name);
  const temporary = `${target}.download`;
  await mkdir(targetDirectory, { recursive: true });

  const response = await fetch(`${baseUrl}${name}`, { dispatcher });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) throw new Error(`${name}: unexpected ${contentType}`);

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0) throw new Error(`${name}: empty response`);
  await writeFile(temporary, bytes);
  await rm(target, { force: true });
  await rename(temporary, target);
  console.log(`${folder}/${name} ${bytes.length} bytes`);
}

await Promise.all(
  Object.entries(assets).flatMap(([folder, names]) => names.map((name) => download(folder, name)))
);

if (dispatcher) await dispatcher.close();
