import { WorldParams } from "../generator/world";
import { state, store } from "../state";
import { Module } from "./store";

@store
export class SettingsManager extends Module {
	@state
	public readonly defaultParamsSettings: WorldParams = new WorldParams();
}