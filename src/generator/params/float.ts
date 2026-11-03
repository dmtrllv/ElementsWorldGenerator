import { observable } from "../../reactive";
import { Param } from "./param";

@observable({ inherit: true })
export class Float extends Param<number> {

}