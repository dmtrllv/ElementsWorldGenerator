import { useState } from "react";
import { Editor } from "../../editor";
import { VectorFieldWorkspace, WorkspaceManager } from "../../editor/workspace";
import { observe } from "../../state";
import { nameToLabel, NumberInput, TextInput, type InputComponent } from "./input";
import type { VectorField, VectorFieldType } from "../../generator/vectorfield";

import "./styles/vector-field-input.scss";

export const VectorFieldInput: InputComponent<VectorField, { open?: boolean, workspaceName?: string }> = ({ workspaceName, name, value, open = true }) => {
	const workspaces = Editor.useModule(WorkspaceManager);
	const vectorField = observe(value);

	const [isOpen, setOpen] = useState(open);

	return (
		<div className={`vector-field-input ${isOpen ? "open" : ""}`}>
			<div className="vector-field-label" onClick={() => setOpen(s => !s)}>
				{nameToLabel(name)}: ({vectorField.type})
				<div className="icon">
					⌄
				</div>
				{vectorField.type !== "static" && (
					<div className="options-btn" onClick={(e) => { e.stopPropagation(); }}>
						<i className="fa-solid fa-ellipsis-vertical" />
						<div className="options">
							<div className="option" onClick={() => { workspaces.open(VectorFieldWorkspace, workspaceName || nameToLabel(name), vectorField) }}>
								Render to texture
							</div>
						</div>
					</div>
				)}
			</div>
			<div className="vector-field-inputs">
				<div className="type-input">
					<div className="label">
						Type:
					</div>
					<select name="vector-field-type" value={vectorField.type} onChange={e => vectorField.type = e.target.value as VectorFieldType}>
						<option value="procedural">Procedural</option>
						<option value="texture">Texture</option>
					</select>
				</div>
				{vectorField.type === "texture" && (
					<>
						<TextInput name="texture" value={vectorField.texturePath || "???"} onChange={_ => { }} />
						{!vectorField.texturePath && (
							<div style={{ display: "flex" }}>
								<div className="label" style={{ flex: 1 }}>

								</div>
								<div className="error" style={{ flex: 1, color: "rgb(233, 77, 77)" }}>
									Missing texture!
								</div>
							</div>
						)}
						<NumberInput name="scale" value={vectorField.scale} onChange={v => vectorField.scale = v} />
						<NumberInput name="strength" value={vectorField.strength} onChange={v => vectorField.strength = v} />
					</>
				)}
				{vectorField.type === "procedural" && (
					<>
						<NumberInput name="scale" value={vectorField.scale} onChange={v => vectorField.scale = v} />
						<NumberInput name="strength" value={vectorField.strength} onChange={v => vectorField.strength = v} />
						<NumberInput name="frequency" value={vectorField.frequency} onChange={v => vectorField.frequency = v} />
						<NumberInput name="roughness" value={vectorField.roughness} onChange={v => vectorField.roughness = v} />
						<NumberInput name="octaves" value={vectorField.octaves} onChange={v => vectorField.octaves = v} />
					</>
				)}
			</div>
		</div>
	);
}