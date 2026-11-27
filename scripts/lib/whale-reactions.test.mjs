import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { whaleFaceValues, whaleHitZone, WHALE_MOTION_SECONDS } from '../../src/lib/whale-reactions.ts';

const defaults = new Map([
 ['ParamEyeLOpen',1],['ParamEyeROpen',1],['ParamMouthForm',0],['ParamMouthOpenY',0],
 ['Paramhh2',.1],['ParamCheek16',0],['ParamCheek17',0],['ParamCheek21',0],['love',0],
]);

test('a wink returns to two open eyes and default cheeks after the reaction ends', () => {
 const wink = whaleFaceValues('wink',defaults,1);
 assert.equal(wink.get('ParamEyeROpen'),0);
 assert.equal(wink.get('ParamEyeLOpen'),1);
 const idle = whaleFaceValues('idle',defaults,1);
 assert.equal(idle.get('ParamEyeROpen'),1);
 assert.equal(idle.get('ParamCheek21'),0);
 assert.equal(idle.get('Paramhh2'),.1);
});

test('changing between heart eyes and stars clears the previous special effect', () => {
 const heart = whaleFaceValues('heart',defaults,1);
 assert.equal(heart.get('ParamCheek17'),1);
 assert.equal(heart.get('love'),1);
 const stars = whaleFaceValues('stars',defaults,1);
 assert.equal(stars.get('ParamCheek16'),1);
 assert.equal(stars.get('ParamCheek17'),0);
 assert.equal(stars.get('love'),0);
 assert.equal(defaults.get('Paramhh2'),.1,'The source defaults must stay reusable');
});

test('blinks remain bounded and unknown moods fall back to the neutral face', () => {
 assert.equal(whaleFaceValues('idle',defaults,2).get('ParamEyeLOpen'),1);
 assert.equal(whaleFaceValues('idle',defaults,-1).get('ParamEyeROpen'),0);
 assert.equal(whaleFaceValues('__proto__',defaults,.5).get('ParamEyeLOpen'),.5);
});

test('transparent canvas margins cannot trigger a model-part interaction', () => {
 for (const point of [[-.1,.5],[.5,-.1],[1.1,.5],[.5,1.1],[NaN,.5]]) assert.equal(whaleHitZone(...point),undefined);
 assert.equal(whaleHitZone(.5,.18),'head');
 assert.equal(whaleHitZone(.4,.5),'face');
 assert.equal(whaleHitZone(.9,.45),'tail');
 assert.equal(whaleHitZone(.4,.9),'body');
});

test('one-shot action limits follow the real source motion lengths', async () => {
 const model = JSON.parse(await readFile(new URL('../../public/companions/whale-girl/c_0120.model3.json',import.meta.url),'utf8'));
 for (const [group,seconds] of Object.entries(WHALE_MOTION_SECONDS)) {
  const resource = model.FileReferences.Motions[group][0].File;
  const motion = JSON.parse(await readFile(new URL(`../../public/companions/whale-girl/${resource}`,import.meta.url),'utf8'));
  assert.equal(seconds,motion.Meta.Duration);
  assert.ok(seconds>0 && seconds<=8,'An interaction must finish rather than looping forever');
 }
});
