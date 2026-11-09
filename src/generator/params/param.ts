import { createObservable, observable, } from "../../reactive";
import type { WorldParams } from "../world-params";

const cloneValue = <T>(value: T): T => {
    if (Array.isArray(value))
        return value.map(cloneValue) as T;

    if (value && typeof value === "object") {
        const source = value as Record<string, unknown>;
        const target = Object.create(Object.getPrototypeOf(value)) as Record<string, unknown>;

        for (const key of Object.keys(source))
            target[key] = cloneValue(source[key]);

        return target as T;
    }

    return value;
};

@observable
export abstract class Param<State extends {}, Options extends {} = {}> {
	protected readonly worldParams: WorldParams;

	private readonly info: ParamInfo<State, Options>;

	public get name() { return this.info.name; }
	public get description() { return this.info.description; }
	public get options() { return this.info.options; }

	@observable
	public state: State;

	public constructor(worldParams: WorldParams, info: ParamInfo<State, Options>, state: State = info.default) {
		this.worldParams = worldParams;
		this.info = info;
		this.state = (state && typeof state === "object" ? createObservable(state) : state) as State;
	}

	public reset() {
		if (typeof this.state === "object" && this.state)
			Object.assign(this.state, this.info.default);
		else
			this.state = this.info.default;
	}

	public snapshot(): State {
		return cloneValue(this.state);
	}
}1

export type ParamInfo<T, O> = {
	readonly name: string;
	readonly description: string;
	readonly default: T;
	readonly options?: O;
}

export type ParamState<T> = T extends Param<infer S> ? S : never;
export type ParamOptions<T> = T extends Param<any, infer O> ? Partial<O> : never;

export type ParamType<T extends Param<any>> = new (worldParams: WorldParams, info: ParamInfo<ParamState<T>, ParamOptions<T>>, state: ParamState<T>) => T;