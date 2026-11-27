/** Expression values follow the credited upstream whale-girl model manifest. */
export type WhaleMood = 'idle' | 'wave' | 'happy' | 'shy' | 'stars' | 'wink' | 'curious' | 'heart';
export type WhaleMotion = 'bubble' | 'selfie' | 'splash';
export type WhaleZone = 'head' | 'face' | 'tail' | 'body';
interface Parameter { id: string; value: number; blend: string }
const presets: ReadonlyMap<string, readonly Parameter[]> = new Map([
 [
  "happy",
  [
   {
    "id": "ParamCheek76",
    "value": 1,
    "blend": "Add"
   },
   {
    "id": "ParamEyeLOpen",
    "value": 0,
    "blend": "Add"
   },
   {
    "id": "ParamEyeROpen",
    "value": 0,
    "blend": "Add"
   },
   {
    "id": "ParamBrowLX",
    "value": -1,
    "blend": "Add"
   },
   {
    "id": "ParamBrowLY",
    "value": -0.800000011920929,
    "blend": "Add"
   },
   {
    "id": "ParamBrowLAngle",
    "value": -1,
    "blend": "Add"
   },
   {
    "id": "ParamBrowLForm",
    "value": -0.6000000238418579,
    "blend": "Add"
   },
   {
    "id": "ParamBrowRX",
    "value": -1,
    "blend": "Add"
   },
   {
    "id": "ParamBrowRY",
    "value": -0.800000011920929,
    "blend": "Add"
   },
   {
    "id": "ParamBrowRAngle",
    "value": -1,
    "blend": "Add"
   },
   {
    "id": "ParamBrowRForm",
    "value": -0.6000000238418579,
    "blend": "Add"
   },
   {
    "id": "ParamMouthForm",
    "value": 1.5,
    "blend": "Add"
   }
  ]
 ],
 [
  "shy",
  [
   {
    "id": "Paramhh2",
    "value": 1,
    "blend": "Add"
   }
  ]
 ],
 [
  "stars",
  [
   {
    "id": "ParamCheek16",
    "value": 1,
    "blend": "Add"
   }
  ]
 ],
 [
  "wink",
  [
   {
    "id": "ParamCheek21",
    "value": 1,
    "blend": "Add"
   },
   {
    "id": "ParamEyeROpen",
    "value": -1,
    "blend": "Add"
   },
   {
    "id": "ParamMouthForm",
    "value": 1.5,
    "blend": "Add"
   }
  ]
 ],
 [
  "curious",
  [
   {
    "id": "ParamCheek74",
    "value": 1,
    "blend": "Add"
   }
  ]
 ],
 [
  "heart",
  [
   {
    "id": "ParamCheek15",
    "value": 0,
    "blend": "Add"
   },
   {
    "id": "ParamCheek17",
    "value": 1,
    "blend": "Add"
   },
   {
    "id": "Paramhh2",
    "value": 1,
    "blend": "Add"
   },
   {
    "id": "ParamBrowLX",
    "value": 0,
    "blend": "Add"
   },
   {
    "id": "ParamBrowLY",
    "value": -0.30000001192092896,
    "blend": "Add"
   },
   {
    "id": "ParamBrowLAngle",
    "value": 0.20000004768371582,
    "blend": "Add"
   },
   {
    "id": "ParamBrowLForm",
    "value": -1,
    "blend": "Add"
   },
   {
    "id": "ParamBrowRX",
    "value": 0,
    "blend": "Add"
   },
   {
    "id": "ParamBrowRY",
    "value": -0.30000001192092896,
    "blend": "Add"
   },
   {
    "id": "ParamBrowRAngle",
    "value": 0.20000004768371582,
    "blend": "Add"
   },
   {
    "id": "ParamBrowRForm",
    "value": -1,
    "blend": "Add"
   }
  ]
 ]
]);
export const WHALE_MOTION_SECONDS: Record<WhaleMotion,number> = {"bubble":5,"selfie":3.3,"splash":0.467};
const owned = new Set(['ParamEyeLOpen','ParamEyeROpen','ParamMouthForm','ParamMouthOpenY','Paramhh2','love',...[...presets.values()].flatMap(params => params.map(p=>p.id))]);

/** Rebuild the face from defaults so switching expressions never leaves the last eyes behind. */
export function whaleFaceValues(mood: string, defaults: ReadonlyMap<string,number>, blink: number): Map<string,number> {
 const values = new Map([...owned].map(id=>[id,defaults.get(id) || 0]));
 const openness = Math.max(0,Math.min(1,blink));
 values.set('ParamEyeLOpen',openness); values.set('ParamEyeROpen',openness);
 values.set('ParamMouthOpenY',mood==='wave' ? .15 : 0);
 if (mood==='wave') values.set('ParamMouthForm',.75);
 for (const parameter of presets.get(mood) || []) {
  values.set(parameter.id,parameter.blend==='Add' ? (values.get(parameter.id) || 0)+parameter.value : parameter.value);
 }
 if (mood==='heart') values.set('love',1);
 return values;
}

/** Coordinates are normalized to the painted model, excluding transparent canvas padding. */
export function whaleHitZone(x: number,y: number): WhaleZone | undefined {
 if (!Number.isFinite(x) || !Number.isFinite(y) || x<0 || x>1 || y<0 || y>1) return;
 if (x>.76 && y>.18 && y<.82) return 'tail';
 if (y<.34) return 'head';
 if (y<.65 && x>.1 && x<.76) return 'face';
 return 'body';
}
