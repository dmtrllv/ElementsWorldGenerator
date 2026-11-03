import type { Generator } from "../generator";
import type { ParamGroup, ParamGroupType } from "../param-groups/param-group";
import type { Param, ParamType } from "../params";

export abstract class ParamMap<T> {
	public readonly generator: Generator;

	public get worldParams() {
		return this.generator.worldParams;
	}

	public constructor(generator: Generator) {
		this.generator = generator;
	}

	public abstract get(x: number, y: number): T;

	public dispose(): void { }
}

export type ParamMapType<T extends ParamMap<any>> = new (generator: Generator) => T;

export const dependency = <T extends ParamMap<any>, K extends keyof T>(_type: DependencyType<T, K>) => (_target: T, _key: K) => {

};

export type DependencyType<T extends ParamMap<T>, K extends keyof T> =
	T[K] extends ParamMap<any> ? ParamMapType<T[K]> :
	T[K] extends ParamGroup<any> ? ParamGroupType<T[K]> :
	T[K] extends Param<any> ? ParamType<T[K]> :
	never;