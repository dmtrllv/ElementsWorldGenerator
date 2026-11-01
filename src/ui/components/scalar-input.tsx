import { useState } from "react";
import { Editor } from "../../editor";
import { ScalarWorkspace, WorkspaceManager } from "../../editor/workspace";
import type { NormalizationType, Scalar, ScalarType } from "../../generator/scalar";
import { observe } from "../../state";
import { nameToLabel, NumberInput, TextInput, type InputComponent } from "./input";

import "./styles/scalar-input.scss";

export const ScalarInput: InputComponent<Scalar, { open?: boolean }> = ({ name, value, open = true }) => {
	const workspaces = Editor.useModule(WorkspaceManager);
	const scalar = observe(value);

	const [isOpen, setOpen] = useState(open);

	return (
		<div className={`scalar-input ${isOpen ? "open" : ""}`}>
			<div className="scalar-label" onClick={() => setOpen(s => !s)}>
				{nameToLabel(name)}: ({scalar.type})
				<div className="icon">
					⌄
				</div>
				{scalar.type !== "static" && (
					<div className="options-btn" onClick={(e) => { e.stopPropagation(); }}>
						<i className="fa-solid fa-ellipsis-vertical" />
						<div className="options">
							<div className="option" onClick={() => { workspaces.open(ScalarWorkspace, name, scalar) }}>
								Render to texture
							</div>
						</div>
					</div>
				)}
			</div>
			<div className="scalar-inputs">
				<div className="type-input">
					<div className="label">
						Type:
					</div>
					<select name="scalar-type" value={scalar.type} onChange={e => scalar.type = e.target.value as ScalarType}>
						<option value="static">Static</option>
						<option value="procedural">Procedural</option>
						<option value="texture">Texture</option>
					</select>
				</div>
				{scalar.type === "static" && <NumberInput name="value" value={scalar.value} onChange={v => scalar.value = v} />}
				{scalar.type === "texture" && (
					<>
						<TextInput name="texture" value={scalar.texturePath || "???"} onChange={_ => { }} />
						{!scalar.texturePath && (
							<div style={{ display: "flex" }}>
								<div className="label" style={{ flex: 1 }}>

								</div>
								<div className="error" style={{ flex: 1, color: "rgb(233, 77, 77)" }}>
									Missing texture!
								</div>
							</div>
						)}
						<div className="type-input">
							<div className="label">
								Normalization:
							</div>
							<select name="normalization" value={scalar.normalization} onChange={e => scalar.normalization = e.target.value as NormalizationType}>
								<option value="-1/1">-1/1</option>
								<option value="0/1">0/1</option>
							</select>
						</div>
						<NumberInput name="scale" value={scalar.scale} onChange={v => scalar.scale = v} />
						<NumberInput name="strength" value={scalar.strength} onChange={v => scalar.strength = v} />
					</>
				)}
				{scalar.type === "procedural" && (
					<>
						<div className="type-input">
							<div className="label">
								Normalization:
							</div>
							<select name="normalization" value={scalar.normalization} onChange={e => scalar.normalization = e.target.value as NormalizationType}>
								<option value="-1/1">-1/1</option>
								<option value="0/1">0/1</option>
							</select>
						</div>
						<NumberInput name="scale" value={scalar.scale} onChange={v => scalar.scale = v} />
						<NumberInput name="strength" value={scalar.strength} onChange={v => scalar.strength = v} />
						<NumberInput name="frequency" value={scalar.frequency} onChange={v => scalar.frequency = v} />
						<NumberInput name="roughness" value={scalar.roughness} onChange={v => scalar.roughness = v} />
						<NumberInput name="octaves" value={scalar.octaves} onChange={v => scalar.octaves = v} />
					</>
				)}
			</div>
		</div>
	);
}