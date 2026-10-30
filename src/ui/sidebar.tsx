import { Editor } from "../editor";
import { Generator, WorldSettings } from "../editor/generator";
import { SettingsView } from "./components";
import { useSlider } from "./hooks/slider";

export const Sidebar = () => {
	const generator = Editor.use(Generator);
	const { size: width, onMouseDown } = useSlider(360, 320, 640, "x");
	return (
		<div id="sidebar" style={{ flexBasis: width }}>
			<SettingsView type={WorldSettings} settings={generator.worldSettings} />
			<button onClick={generator.generate}>Generate</button>
			<div className="slider" onMouseDown={onMouseDown} />
		</div>
	);
}
