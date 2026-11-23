export const FLOOR_DATES = ['2026-05-06', '2026-05-13', '2026-05-20', '2026-05-27', '2026-06-03'] as const;
export const FLOOR_DEFAULT_STEP = 2;
export const FLOOR_EXAMPLE_PACKAGE_KEY = 'B01';

export const FLOOR_STATUSES = {
  complete: { label: '符合计划', color: '#36b869' },
  behind: { label: '落后计划', color: '#f17b80' },
  ahead: { label: '超出计划', color: '#6e9fff' },
  pending: { label: '尚未开工', color: '#a4aeba' },
} as const;

export const FLOOR_COLOR_MODES = {
  status: '计划状态',
  progress: '实际完成比例',
  original: '模型原色',
} as const;

export type FloorColorMode = keyof typeof FLOOR_COLOR_MODES;
export type FloorStatus = keyof typeof FLOOR_STATUSES;

type FloorSeries = readonly [number, number, number, number, number];

export interface FloorPackage {
  key: string;
  label: string;
  elementIds: readonly string[];
  plan: FloorSeries;
  actual: FloorSeries;
  quantity: number;
  document: { title: string; date: string; fields: readonly (readonly [string, string])[] };
  todo: { title: string; due: string; assignee: string; closedOn: string };
}

// Work packages and business records are fictional. Element IDs belong to the local GLB.
export const FLOOR_ZONES: readonly { label: string; packages: readonly FloorPackage[] }[] = [
  {
    label: '标准层 · A 区',
    packages: [
      {
        key: 'A01', label: 'A01 作业面', elementIds: ['1311857', '1311921'],
        plan: [20, 65, 100, 100, 100], actual: [20, 65, 100, 100, 100], quantity: 40,
        document: { title: '作业面验收单', date: '2026-05-20', fields: [['复核范围', 'A01 作业面'], ['检查项', '工作面移交、外观复核'], ['记录结论', '复核通过，已归档']] },
        todo: { title: '归档现场验收记录', due: '2026-05-20', assignee: '资料员', closedOn: '2026-05-20' },
      },
      {
        key: 'A02', label: 'A02 作业面', elementIds: ['1311939', '1311995', '1312011'],
        plan: [10, 45, 75, 100, 100], actual: [20, 55, 85, 100, 100], quantity: 60,
        document: { title: '周进度复核单', date: '2026-05-13', fields: [['复核范围', 'A02 作业面'], ['填报进度', '55%'], ['记录结论', '实际较计划提前，继续核对下一期计划']] },
        todo: { title: '复核提前完成的工作量', due: '2026-05-27', assignee: '计量员', closedOn: '2026-05-27' },
      },
    ],
  },
  {
    label: '标准层 · B 区',
    packages: [
      {
        key: 'B01', label: 'B01 作业面', elementIds: ['1312037', '1312045', '1312053', '1312061'],
        plan: [10, 45, 85, 100, 100], actual: [10, 30, 65, 90, 100], quantity: 80,
        document: { title: '现场进度核对记录', date: '2026-05-20', fields: [['复核范围', 'B01 作业面'], ['现场结果', '实际完成 65%，较计划落后 20 个百分点'], ['处理意见', '补录本周完成量，复核剩余工序']] },
        todo: { title: '补录本周完成量并复核进度', due: '2026-05-20', assignee: '施工员', closedOn: '2026-05-27' },
      },
      {
        key: 'B02', label: 'B02 作业面', elementIds: ['1312159', '1312119', '1312167', '1312175', '1312183'],
        plan: [0, 10, 55, 85, 100], actual: [0, 10, 35, 70, 100], quantity: 100,
        document: { title: '工序交接记录', date: '2026-05-27', fields: [['复核范围', 'B02 作业面'], ['交接进度', '70%'], ['处理意见', '完成预留工序后安排复验']] },
        todo: { title: '确认下次现场复核时间', due: '2026-05-20', assignee: '质检员', closedOn: '2026-06-03' },
      },
    ],
  },
];

export const FLOOR_PACKAGES = FLOOR_ZONES.flatMap((zone) => zone.packages);
export const FLOOR_PACKAGE_BY_ELEMENT = new Map(FLOOR_PACKAGES.flatMap((item) => item.elementIds.map((id) => [id, item] as const)));

export function getFloorSnapshot(item: FloorPackage, step: number) {
  const plan = item.plan[step];
  const actual = item.actual[step];
  const delta = actual - plan;
  let status: FloorStatus = 'complete';
  if (delta < 0) status = 'behind';
  else if (delta > 0) status = 'ahead';
  else if (actual === 0) status = 'pending';
  return { plan, actual, delta, status };
}

export function getFloorMeasurement(item: FloorPackage, step: number) {
  const cumulative = item.quantity * item.actual[step] / 100;
  const previous = step === 0 ? 0 : item.quantity * item.actual[step - 1] / 100;
  return { contract: item.quantity, period: cumulative - previous, cumulative };
}

export function getFloorTodoStatus(item: FloorPackage, step: number) {
  const date = FLOOR_DATES[step];
  if (date >= item.todo.closedOn) return 'closed';
  if (date > item.todo.due) return 'overdue';
  if (date === item.todo.due) return 'due';
  return 'open';
}
