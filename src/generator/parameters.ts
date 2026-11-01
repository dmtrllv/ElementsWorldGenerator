import { state, Store } from "../state"
import type { WorldParams } from "./world";

export const param = <T extends object, K extends keyof T | string | number | symbol>() => (target: T, key: K & (string | symbol)) => {
	state(target, key);
}

export type ParamArgs<T extends object, K extends keyof T | string | number | symbol> = K extends keyof T ? (
	T extends number ? [] | [NumberParam] :
	T extends string ? [] | [StringParam] :
	[]
) : [] | [NumberParam | StringParam];

export type NumberParam = {
	min?: number;
	max?: number;
	step?: number;
};

export type StringParam = {
	oneOf: string[];
};

export abstract class Params<T extends new (...args: any[]) => Params<any>> extends Store<T> {
	abstract clone(world: WorldParams): InstanceType<T>;
}