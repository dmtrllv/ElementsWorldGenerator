import type { Vector2, Vector3 } from "three";
import { MapData, type MapDataType } from "../maps";
import type { ParamGroup, ParamGroupType } from "../param-groups";
import type { Region } from "../region";
import type { WorldParamsSnapshot } from "../world-params";
import type { ParamType } from "../params";

export abstract class Pass {
	private static readonly meta: Map<PassType<any>, PassMeta> = new Map();

	public static fromOutputType(type: MapDataType<any, any>) {
		for (const [passType, meta] of this.meta) {
			if (Object.values(meta.outputs).find(t => t === type))
				return passType;
		}
		return null;
	}

	public static getMeta(): ReadonlyMap<PassType<any>, PassMeta> {
		return this.meta;
	}

	public static registerDependency<T extends Pass, K extends keyof T>(target: PassType<T>, key: K, args: InferedDependencyArgs<T[K]>) {
		if (!this.meta.has(target))
			this.meta.set(target, { dependencies: {}, outputs: {} });

		if (args[0].prototype instanceof MapData) {
			this.meta.get(target)!.dependencies[key.toString()] = {
				type: args[0],
				scope: args[1] || undefined
			} as any;
		} else {
			this.meta.get(target)!.dependencies[key.toString()] = {
				type: args[0]
			} as any;
		}
	}

	public static registerOutputType<T extends Pass, K extends keyof T>(target: PassType<T>, key: K, type: MapDataType<any, any>) {
		if (!this.meta.has(target))
			this.meta.set(target, { dependencies: {}, outputs: {} });

		this.meta.get(target)!.outputs[key.toString()] = type;
	}

	private readonly worldParams: WorldParamsSnapshot;

	protected get seed(): number {
		return this.worldParams.seed;
	}

	protected get chunkSize(): Readonly<Vector2> {
		return this.worldParams.chunkSize;
	}

	protected get worldSize(): Readonly<Vector3> {
		return this.worldParams.size;
	}

	public constructor(worldParams: WorldParamsSnapshot) {
		this.worldParams = worldParams;
	}

	public abstract generate(region: Region, scope: GenerationScope): void;
}

export type PassMeta = {
	readonly dependencies: Record<string, PassDependency>;
	readonly outputs: Record<string, MapDataType<any, any>>;
};

export type PassDependency = {
	readonly type: ParamGroupType<any>;
} | MapDependency;

type MapDependency = {
	readonly type: MapDataType<any, any>;
	readonly scope?: GenerationScope;
};

export const isMapDependency = (obj: PassDependency): obj is MapDependency => {
	return obj.type.prototype instanceof MapData;
}

export type PassType<T extends Pass> = new (worldParams: WorldParamsSnapshot) => T;

export function dependency<T extends Pass, K extends keyof T>(type: ParamGroupType<any>): any;
export function dependency<T extends Pass, K extends keyof T>(type: MapDataType<any, any>, scope?: GenerationScope): any;
export function dependency<T extends Pass, K extends keyof T>(...args: any[]) {
	return (target: T, key: K) => {
		Pass.registerDependency(target.constructor as any, key as any, args as any);
	};
}

export const GenerationScope = {
	Global: "Global",
	Local: "Local",
} as const;

export type GenerationScope = (typeof GenerationScope)[keyof typeof GenerationScope];

type InferedDependencyArgs<T> =
	T extends ParamGroup<any> ? [ParamGroupType<T>] :
	T extends MapData<any> ? [MapDataType<T, any>] | [MapDataType<T, any>, GenerationScope] :
	never;

export const output = <T extends Pass, K extends keyof T>(type: InferedMapType<T, K>) => (target: T, key: K) => {
	Pass.registerOutputType(target.constructor as any, key as never, type);
};

type InferedMapType<T, K extends keyof T> = T[K] extends MapData<any> ? MapDataType<T[K], any> : never;