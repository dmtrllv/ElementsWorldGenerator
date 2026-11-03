import type { Generator } from "./generator";

export abstract class ParamMap<T> {
	public readonly generator: Generator;
	
	public get worldParams() {
		return this.generator.worldParams;
	}

	public constructor(generator: Generator) {
		this.generator = generator;
	}
	
	public abstract get(x: number, y: number): T;
}

export type ParamMapType<T extends ParamMap<any>> = new (generator: Generator) => T;