import type { Vector2, Vector3 } from "three";

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
	if (obj instanceof Map || obj instanceof Set)
		return last(Array.from(obj.values()));
	if (Array.isArray(obj))
		return obj.length ? obj[obj.length - 1] : undefined;
	return last(Array.from(Object.values(obj))) as T;
}

export const exec = <T>(fn: () => T): T => fn();

export type Immutable<T> =
	T extends (...args: any) => any ? T :
	T extends Vector2 ? Immutable<{ x: number, y: number }> :
	T extends Vector3 ? Immutable<{ x: number, y: number, z: number }> :
	T extends Map<infer K, infer U> ? ReadonlyMap<K, Immutable<U>> :
	T extends Set<infer U> ? ReadonlySet<Immutable<U>> :
	T extends Array<infer U> ? ReadonlyArray<Immutable<U>> :
	T extends object ? T & { readonly [K in keyof T]: Immutable<T[K]> } :
	Readonly<T>;

const BENCHMARK = false;

export const benchmark = (target: any, key: any, description: PropertyDescriptor) => {
	if(!BENCHMARK)
		return;
	
	const original = description.value;

	if (typeof original !== "function") {
		return;
	}

	description.value = function (...args: any[]) {
		const label = `${target.constructor.name}.${String(key)}`;

		console.time(label);

		try {
			return original.apply(this, args);
		}
		finally {
			console.timeEnd(label);
		}
	};
};