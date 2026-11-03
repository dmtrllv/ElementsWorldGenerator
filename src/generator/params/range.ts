import { observable } from "../../reactive";
import { Param } from "./param";

@observable({ inherit: true })
export class Range extends Param<[number, number]> {
	public get min() {
		return this.state[0];
	}

	public get max() {
		return this.state[1];
	}
}