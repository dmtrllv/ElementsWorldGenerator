export const clamp = (val: number, min: number, max: number) => val > max ? max : val < min ? min : val;

export const rgb = (r: number, g: number, b: number) => [r, g, b] as const;

export const random = (min: number = 0, max: number = 1) => Math.random() * (max - min) + min;
export const randomInt = (min: number = 0, max: number = 1) => Math.floor(random(min, max + 1));
export const randomSeed = () => randomInt(-1_000_000_000, 1_000_000_000);