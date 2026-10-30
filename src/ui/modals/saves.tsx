import { useState } from "react";
import { createModal, ModalManager } from "../../editor/modals";
import { TextInput } from "../components";
import { Editor, NotificationManager, SaveManager } from "../../editor";

export const SaveModal = createModal({
	title: "Save As",
	width: 330,
	height: 170,
	Component: ({ modal }) => {
		const [saveName, setValue] = useState("");

		const manager = Editor.use(SaveManager);
		const modals = Editor.use(ModalManager);

		const save = async () => {
			if (manager.getSaves().includes(saveName))
				if(!await modals.confirm(`Project ${saveName} already exists, do you want to overwrite?`))
					return;
			manager.saveAs(saveName);
			modal.close();
		}

		return (
			<div>
				<TextInput name="name" value={saveName} onChange={setValue} />
				<button onClick={save}>Save</button>
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