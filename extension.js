const Main = imports.ui.main;
const Panel = imports.ui.panel;
const {GObject} = imports.gi;

const EXTENSION_INDEX = 2;
const EXTENSION_PLACE = "left";

let indicator = null;

function enable(){
	indicator = new ExtendedAppMenuButton();
}

function disable(){
	indicator.destroy();
	indicator = null;
}

var ExtendedAppMenuButton = GObject.registerClass(
	{ GTypeName: 'ExtendedAppMenuButton' },
class ExtendedAppMenuButton extends Panel.AppMenuButton {
	_init(){
		super._init(Main.panel);
		Main.panel.addToStatusArea('Extended App Menu Button',this,EXTENSION_INDEX,EXTENSION_PLACE);
		Main.panel.statusArea.appMenu.destroy();
	}
});
