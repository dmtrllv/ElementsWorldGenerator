import { WorldParams, type WorldParamProps } from "../generator/world-params";
import { observable,} from "../reactive";
import { Module } from "./store";

@observable
export class SettingsManager extends Module {
	@observable
	public readonly defaultWorldParams: WorldParamProps = WorldParams.defaultProps;
}