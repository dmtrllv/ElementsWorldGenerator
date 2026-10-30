export const clamp = (val: number, min: number, max: number) => val > max ? max : val < min ? min : val;

export const rgb = (r: number, g: number, b: number) => [r, g, b] as [number, number, number];

export const random = (min: number = 0, max: number = 1) => Math.random() * (max - min) + min;
export const randomInt = (min: number = 0, max: number = 1) => Math.floor(random(min, max + 1));
export const randomSeed = () => randomInt(-1_000_000_000, 1_000_000_000);

export function last<T>(map: Map<any, T>): T | undefined;
export function last<T>(set: Set<T>): T | undefined;
export function last<T>(set: Record<any, T>): T | undefined;
export function last<T>(set: T[]): T | undefined;
export function last<T>(obj: any): T | undefined {
	if(obj instanceof Map || obj instanceof Set)
		return last(Array.from(obj.values()));
	if(Array.isArray(obj))
		return obj.length ? obj[obj.length - 1] : undefined;
	return last(Array.from(Object.values(obj))) as T;
}

export const exec = <T>(fn: () => T): T => fn();