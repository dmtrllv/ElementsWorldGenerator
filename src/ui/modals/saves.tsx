import { useState } from "react";
import { createModal } from "../../editor/modals";
import { TextInput } from "../components";
import { Editor, SaveManager } from "../../editor";

export const SaveModal = createModal({
	title: "Save As",
	width: 330,
	height: 170,
	Component: ({ modal }) => {
		const [saveName, setValue] = useState("");

		const manager = Editor.use(SaveManager);

		return (
			<div>
				<TextInput name="name" value={saveName} onChange={setValue} />
				<button onClick={() => manager.saveAs(saveName).then(s => { console.log(s); s && modal.close() })}>Save</button>
				<button onClick={modal.close}>Cancel</button>
			</div>
		)
	}
});

export const OpenModal = createModal({
	title: "Open",
	Component: () => {
		const [value, setValue] = useState("");
		return (
			<div>
				<TextInput name="name" value={value} onChange={setValue} />
			</div>
		)
	}
});