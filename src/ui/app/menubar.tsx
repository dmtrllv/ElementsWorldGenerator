import { Editor, Menu, MenuSep, type MenuItem } from "../../editor";
import { observe } from "../../state";

import "./styles/menubar.scss";

export const Menubar = () => {
	const menubar = Editor.use(Menu);

	return (
		<div id="menubar">
			{menubar.items.map((child) => <MenuItemView key={child.id} item={child} />)}
		</div>
	);
}

const MenuItemView = ({ item }: { item: MenuItem }) => {
	item = observe(item);

	return (
		<div className="menu-item">
			<div className="item" onClick={() => { item.action && item.action(); }}>
				{item.text}
			</div>
			{item.children.length > 0 && (
				<div className="children">
					{item.children.map((child) => {
						if (child instanceof MenuSep)
							return <div key={child.id} className="sep" />;
						return <MenuItemView key={child.id} item={child} />
					})}
				</div>
			)}
		</div>
	);
}