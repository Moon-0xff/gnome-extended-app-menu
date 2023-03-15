const Main = imports.ui.main;
const Panel = imports.ui.panel;
const {Clutter,Gio,GObject,Shell} = imports.gi;
const Volume = imports.ui.status.volume;

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

		this.connect('button-press-event',(_a, event) => this._onClick(event));
		this.connect('scroll-event', (_a, event) => this._onScroll(event));

		this.volumeControl = Volume.getMixerControl();
		this.volumeControl.connect("stream-added", this._getStream.bind(this));
		this.volumeControl.connect("stream-removed",this._getStream.bind(this));

		this.connect('changed',() => this._getStream());
	}
	_onClick(event){
		if(event.get_button() == Clutter.BUTTON_MIDDLE){
			this._changeVolume(0);
			return Clutter.EVENT_STOP;
		}
	}
	_onScroll(event) {
		if (event.is_pointer_emulated())
			return Clutter.EVENT_PROPAGATE;

		if (event.get_scroll_direction() == Clutter.ScrollDirection.SMOOTH){
			let delta = -event.get_scroll_delta()[1];
			delta = Math.clamp(-1,delta,1);

			if(!delta == 0)
				this._changeVolume(delta)

			return Clutter.EVENT_STOP;
		}
	}
	_changeVolume(delta){
		if(this.stream.length == 0)
			return

		let max = this.volumeControl.get_vol_max_norm()
		let step = max / 30;
		let volume = this.stream[0].volume;
		this.stream.forEach(stream => {//if multiple stream, use the lowest as base reference
			if (stream.volume < volume)
				volume = stream.volume;
		});

		let newVolume = volume + step * delta;
		newVolume = Math.round(Math.clamp(0,newVolume,max));

		this.stream.forEach(stream => {
			stream.volume = newVolume;
			stream.push_volume();
		});

		let volumeRatio = newVolume/max;
		let monitor = global.display.get_current_monitor(); //identify current monitor for OSD

		if(delta == 0){//toggle mute
			this.stream.forEach(stream => {
				stream.change_is_muted(!stream.is_muted);
				if(!stream.is_muted) //set mute icon
					volumeRatio = 0
			});
		}

		const icon = Gio.Icon.new_for_string(this._setVolumeIcon(volumeRatio));
		Main.osdWindowManager.show(monitor, icon, this.name, volumeRatio);
	}
	_getStream(){
		if(!this._targetApp)
			return

		this.name = this._targetApp.get_name();

		if(!this.name)
			return

		const streamList = this.volumeControl.get_streams();
		this.stream = [];

		streamList.forEach(stream => {
			if(	stream.get_name().toLowerCase() == this.name.toLowerCase())
				this.stream.push(stream);
		});

		if (this.stream.length > 0)
			return this.stream

		streamList.forEach(stream => {
			if(
				stream.get_name().match(new RegExp(this.name,"i")) ||
				this.name.match(new RegExp(stream.get_name(),"i"))
			)
				this.stream.push(stream);
		});

		return this.stream
	}
	_setVolumeIcon(volume) {
		let volume_icon = 'audio-volume-high-symbolic';
		switch (true) {
			case (volume == 0):
				volume_icon = 'audio-volume-muted-symbolic';
				break
			case (volume < 0.33):
				volume_icon = 'audio-volume-low-symbolic';
				break
			case (volume < 0.67):
				volume_icon = 'audio-volume-medium-symbolic';
				break
		}
		return volume_icon
	}
	vfunc_event(event){ //inherited method override
		return Clutter.EVENT_PROPAGATE;
	}
});
