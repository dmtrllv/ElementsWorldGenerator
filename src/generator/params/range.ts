import { Param } from "./param";

export class Range extends Param<[number, number]> {
	public get min() {
		return this.state[0];
	}

	public get max() {
		return this.state[1];
	}
}