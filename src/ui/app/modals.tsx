import { Editor } from "../../editor";
import { ConfirmModal, Modal, ModalManager } from "../../editor/modals";
import { observe } from "../../state";
import { last } from "../../utils";
import { useEvent } from "../hooks/event";

import "./styles/modal.scss";

export const Modals = () => {
	const manager = Editor.use(ModalManager);

	const closeLast = () => {
		const modal = last(manager.modals);
		if (modal && modal.closable) {
			modal.close();
		};
	}

	useEvent("keydown", (e) => {
		if (e.key === "Escape") {
			closeLast();
		}
	});

	return (
		<>
			<div className={"modal-bg " + (manager.modals.length > 0 ? "show" : "")} onMouseDown={closeLast}>
				{manager.modals.map(modal => <ModalWindow key={modal.id} modal={modal} />)}
			</div>
			<div className={"modal-bg " + (manager.confirmModal ? "show" : "")}>
				{manager.confirmModal && <ConfirmWindow modal={manager.confirmModal} />}
			</div>
		</>
	);
}

const ModalWindow = (props: { modal: Modal }) => {
	const modal = observe(props.modal);
	return (
		<div className="modal" onMouseDown={e => e.stopPropagation()} style={{ width: modal.width + "px", height: modal.height + "px" }}>
			<div className="titlebar">
				<div className="title">{modal.title}</div>
				{modal.closable && <div className="close-btn" onClick={modal.close} />}
			</div>
			<div className="body">
				<modal.Component modal={modal} />
			</div>
		</div>
	);
};

const ConfirmWindow = ({ modal }: { modal: ConfirmModal }) => {
	const { message } = observe(modal);
	return (
		<div className="modal">
			<div className="titlebar">
				<div className="title">{modal.title}</div>
				<div className="close-btn" onClick={modal.close} />
			</div>
			<div className="body">
				<div className="message">
					{message}
				</div>
				<div className="footer">
					<button onClick={modal.confirm}>Confirm</button>
					<button onClick={modal.close}>Cancel</button>
				</div>
			</div>
		</div>
	);
};

