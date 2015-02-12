View = {
	mousedown : false,
	dragging : false,
	_dropped : false,
	grab : function(e) {
		this.mousedown = true;
		Crafty.viewport.mouselook('start', e);
	},
	drag : function(e) {
		if (this.mousedown) this.dragging = true;
		Crafty.viewport.mouselook('drag', e);
	},
	drop : function() {
		if (this.dragging) this._dropped = true;
		this.mousedown = this.dragging = false;
		Crafty.viewport.mouselook('stop');
	}
}
P(View).get('dropped', function() {
	var dropped = this._dropped;
	this._dropped = false;
	return dropped;
});

Game = {
	demo : function() {
		Crafty.init();
		Crafty.viewport.mouselook(true);
		Crafty.addEvent(View, Crafty.stage.elem, 'mousedown', View.grab);
		Crafty.addEvent(View, Crafty.stage.elem, 'mousemove', View.drag);
		Crafty.addEvent(View, document, 'mouseup', View.drop);

		var keydowns = 0, frames;
		Crafty.bind('KeyDown', function(e) {
			var ks = keydowns++;
			if (ks === 0) frames = 0;
		})
		Crafty.bind('KeyUp', function(e) {
			var ks = --keydowns;
			if (ks === 0) frames = 0;
		})
		Crafty.bind('EnterFrame', function(e) {
			var f = 0;
			if (Crafty.keydown[Crafty.keys.UP_ARROW]) {
				if (frames % 2 == 0) Crafty.viewport.y += Map.unit.h / 2;
				f++;
			}
			if (Crafty.keydown[Crafty.keys.RIGHT_ARROW]) {
				if (frames % 2 == 0) Crafty.viewport.x -= Map.unit.w / 2;
				f++;
			}
			if (Crafty.keydown[Crafty.keys.DOWN_ARROW]) {
				if (frames % 2 == 0) Crafty.viewport.y -= Map.unit.h / 2;
				f++;
			}
			if (Crafty.keydown[Crafty.keys.LEFT_ARROW]) {
				if (frames % 2 == 0) Crafty.viewport.x += Map.unit.w / 2;
				f++;
			}

			if (f) {
				Crafty.viewport._clamp();
				frames++;
			}
		});

		Characters.hero = new Hero;

		Tiles.load('map.json', function(map) {
			console.log('loading...');
			map.show();
			console.log('done.');
		})
	}
}
