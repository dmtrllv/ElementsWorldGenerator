import { observable, } from "../../reactive";
import type { Param, ParamInfo, ParamState, ParamType } from "../params/param";
import type { WorldParams } from "../world-params";

@observable
export abstract class ParamGroup<T extends ParamGroup<T>> {
	public static getDefaultProps<T extends typeof ParamGroup<any>>(this: T): ParamGroupProps<InstanceType<T>> {
		const props: any = {};

		const groups = (this as any)[SUB_GROUPS];
		for (const n in groups)
			props[n] = groups[n].getDefaultProps();

		const params = (this as any)[PARAMS];
		for (const n in params)
			props[n] = params[n].info.default;

		return props;
	}

	public static init<T extends typeof ParamGroup<any>>(this: T, worldParams: WorldParams, props: ParamGroupProps<InstanceType<T>>) {
		const info = getGroupInfo(this);
		const values: Record<any, any> = {};
		for (const k in props) {
			const val = props[k as keyof typeof props] as any;
			const GroupType = getSubGroupType(this, k);
			if (GroupType) {
				values[k] = GroupType.init(worldParams, val);
			} else {
				const t = getParamType(this, k);
				if (t) {
					const { info, type } = t;
					values[k] = new type(worldParams, info, val);
				} else {
					throw new Error(`Missing decorator on ${this.name}.${k}`)
				}
			}
		}
		const x = new (this as any)(worldParams, info);
		return Object.assign(x, values);
	}

	public params(): Record<string, Param<any>> {
		const groups = (this.constructor as any)[PARAMS];
		const c: any = {};
		for (const n in groups) {
			if (n in this)
				c[n] = (this as any)[n]
		}
		return c;
	}

	public subGroups(): Record<string, ParamGroup<any>> {
		const groups = (this.constructor as any)[SUB_GROUPS];
		const c: any = {};
		for (const n in groups) {
			if (n in this)
				c[n] = (this as any)[n]
		}
		return c;
	}

	private readonly info: GroupInfo;

	public get name() { return this.info.name; }
	public get description() { return this.info.description; }

	protected readonly worldParams: WorldParams;

	public constructor(worldParams: WorldParams, info: GroupInfo) {
		this.worldParams = worldParams;
		this.info = info;
	}

	public toProps(): ParamGroupProps<T> {
		const props: Record<string, unknown> = {};

		for (const [key, group] of Object.entries(this.subGroups()))
			props[key] = group.toProps();

		for (const [key, param] of Object.entries(this.params()))
			props[key] = param.snapshot();

		return props as ParamGroupProps<T>;
	}
}

export type ParamGroupType<T extends ParamGroup<any>> = new (worldParams: WorldParams, info: GroupInfo) => T;

export type ParamGroupProps<T extends ParamGroup<T>> = {
	[K in GroupKeys<T>]: T[K] extends ParamGroup<any> ? ParamGroupProps<T[K]> : never;
} & {
	[K in ParamKeys<T>]: T[K] extends Param<infer State> ? State : never;
};

export type ParamGroupValues<T extends ParamGroup<T>> = {
	[K in GroupKeys<T>]: T[K] extends ParamGroup<any> ? ParamGroup<T[K]> : never;
} & {
	[K in ParamKeys<T>]: T[K] extends Param<any> ? T[K] : never;
};

const INFO = Symbol("INFO");

const getGroupInfo = (target: Function): GroupInfo | null => {
	return (target as any)[INFO];
}

export const group = <T extends ParamGroup<T>>(info: GroupInfo) => (target: ParamGroupType<T>) => {
	(target as any)[INFO] = info;
	return observable(target) as any;
};

export type GroupInfo = {
	readonly name: string;
	readonly description: string;
};

const PARAMS = Symbol("PARAMS");

const getParamType = <T extends ParamGroup<T>>(target: ParamGroupType<T> | typeof ParamGroup, key: string): { type: ParamType<any>, info: ParamInfo<any> } | undefined => {
	const ctor = target as any;
	return ctor[PARAMS]?.[key] as any;
};

export const param = <T extends ParamGroup<T>, K extends ParamKeys<T>>(type: T[K] extends Param<any> ? ParamType<T[K]> : never, info: ParamInfo<ParamState<T[K]>>) => (target: T, key: K) => {

	const ctor = target.constructor as any;
	if (!ctor[PARAMS])
		ctor[PARAMS] = {};
	ctor[PARAMS][key] = {
		type,
		info
	};
	observable(target, key as any);
};

type ParamKeys<T extends ParamGroup<T>> = {
	[K in keyof T]: T[K] extends Param<any> ? K : never;
}[keyof T];

const SUB_GROUPS = Symbol("SUB_GROUPS");

const getSubGroupType = <T extends ParamGroup<T>>(target: ParamGroupType<T> | typeof ParamGroup, key: string): typeof ParamGroup | undefined => {
	const ctor = target as any;
	return ctor[SUB_GROUPS]?.[key] as any;
};

export const subGroup = <T extends ParamGroup<T>, K extends keyof T>(type: new (...args: any[]) => T[K]) => (target: T, key: K) => {
	const ctor = target.constructor as any;
	if (!ctor[SUB_GROUPS])
		ctor[SUB_GROUPS] = {};
	ctor[SUB_GROUPS][key] = type;
};

type GroupKeys<T extends ParamGroup<T>> = {
	[K in keyof T]: T[K] extends ParamGroup<any> ? K : never;
}[keyof T];

export const preview = () => {

}