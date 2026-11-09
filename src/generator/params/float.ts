import { observable } from "../../reactive";
import { Param } from "./param";

@observable({ inherit: true })
export class Float extends Param<number, FloatOptions> {

}

export type FloatOptions = {
	min?: number;
	max?: number;
	step?: number;
}