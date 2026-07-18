const BASE_WIDTH = 1440;
const BASE_HEIGHT = 900;

function trim(value: number) {
  return Number(value.toFixed(3));
}

export function dvw(value: number) {
  return `${trim((value / BASE_WIDTH) * 100)}dvw` as any;
}

export function dvh(value: number) {
  return `${trim((value / BASE_HEIGHT) * 100)}dvh` as any;
}
