import { WorldParams, type WorldParamProps } from "../generator/world-params";
import { observable, state } from "../state";
import { Module } from "./store";

@observable
export class SettingsManager extends Module {
	@state
	public readonly defaultWorldParams: WorldParamProps = WorldParams.defaultProps;
}