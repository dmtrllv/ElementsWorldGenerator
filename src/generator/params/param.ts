import { createObservable, observable,} from "../../reactive";
import type { WorldParams } from "../world-params";

@observable
export abstract class Param<State extends {}> {
	protected readonly worldParams: WorldParams;

	private readonly info: ParamInfo<State>;

	public get name() { return this.info.name; }
	public get description() { return this.info.description; }

	@observable
	public state: State;

	public constructor(worldParams: WorldParams, info: ParamInfo<State>, state: State = info.default) {
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
}

export type ParamInfo<T> = {
	readonly name: string;
	readonly description: string;
	readonly default: T;
}

export type ParamState<T> = T extends Param<infer S> ? S : never;

export type ParamType<T extends Param<any>> = new (worldParams: WorldParams, info: ParamInfo<ParamState<T>>, state: ParamState<T>) => T;