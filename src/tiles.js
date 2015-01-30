Crafty.c('_GridRoot', {
	init : function() {
		this.requires('2D, Multiway')
			.multiway({ UP_ARROW : 90, RIGHT_ARROW : 180, DOWN_ARROW : -90, LEFT_ARROW : 0 })
	}
})

Grid = {
	root : undefined,
	count : 0,
	_startDrag : function(e) {
		this._dragFrom = { x : e.clientX, y : e.clientY };
	},
	_dragging : function(e) {
		var from = this._dragFrom;
		var to = { x : e.clientX, y : e.clientY };

		var dx = to.x - from.x;
		this.x -= dx;
		Grid.root.x += dx;

		var dy = to.y - from.y;
		this.y -= dy;
		Grid.root.y += dy;

		this._dragFrom = to;
	}
}

Crafty.c('Grid', {
	_unit : { _w : 32, _h : 32 },
	init : function() {
		if (!Grid.root) {
			Grid.root = Crafty.e('_GridRoot');
		}
		Grid.root.attach(this);

		var grid = this.requires('2D').attr({
			x : Grid.root._x,
			y : Grid.root._y
		});
	
		this._gridId = '_grid' + (++Grid.count);
		this._tileCID = this._gridId + ':Tile';
		Crafty.c(this._tileCID, {
			init : function() {
				this.requires('Tile').place(grid);
			}
		});

		var atc = this.attach;
		this.attach = function(c) {
			atc.call(this, c);
			if (c && c.has('Tile')) {
				c.w = this._unit._w;
				c.h = this._unit._h;

				c._wasDraggable = c.has('Draggable');
				c.requires('Draggable')
					.bind('StartDrag', Grid._startDrag)
					.bind('Dragging', Grid._dragging);
			}
			return this;
		}

		var dtc = this.detach;
		this.detach = function(c) {
			dtc.call(this, c);
			if (c && c.has('Tile')) {
				c.unbind('StartDrag', Grid._startDrag)
					.unbind('Dragging', Grid._dragging);
				if (c._wasDraggable) {
					c.removeComponent('Draggable');
				}
			}
			return this;
		}

		Object.defineProperties(this, {
			_gridId : {
				writable : false,
				enumerable : false
			},
			_unit : { 
				writable : true,
				enumerable : false
			},
			unit : {
				enumerable : true,
				configurable : true,
				get : function() { return this._unit },
				set : function(u) {
					var w = u.w, h = u.h;
					if (w) this._unit._w = w;
					if (h) this._unit._h = h;
					var children = this._children;
					for (var i = 0; i < children.length; i++) {
						if (w) children[i].w = w;
						if (h) children[i].h = h;
					}
				}
			},
		});

		Object.defineProperties(this._unit, {
			_w : { enumerable : false },
			w : {
				enumerable : true,
				configurable : true,
				get : function() { return this._w },
				set : function(w) {
					this._w = w;
					var children = grid._children;
					for (var i = 0; i < children.length; i++) {
						children[i].w = w;
					}
				}
			},
			_h : { enumerable : false },
			h : {
				enumerable : true,
				configurable : true,
				get : function() { return this._h },
				set : function(h) {
					this._h = h;
					var children = grid._children;
					for (var i = 0; i < children.length; i++) {
						children[i].h = h;
					}
				}
			}
		});

		this._tiles = {};
	},
	tileAt : function(row, col) {
		var tiles = this._tiles;
		var coords = row + ':' + col;
		var tile = tiles[coords];
		if (!tile) {
			tile = Crafty.e(this._tileCID).place(this, row, col);
		}
		return tile;
	}
});

Crafty.c('Tile', {
	_row : 0,
	_col : 0,
	init : function() {
		this.requires('2D')

		var W = Object.getOwnPropertyDescriptor(this, 'w');
		var setw = W.set;
		W.set = function(w) {
			setw.call(this, w);
			this.x = this._parent._x + this._col * w;
		}
		var H = Object.getOwnPropertyDescriptor(this, 'h');
		var seth = H.set;
		H.set = function(h) {
			seth.call(this, h);
			this.y = this._parent._y + this._row * h;
		}
		Object.defineProperties(this, {
			_row : {},
			row : {
				configurable : true,
				enumerable : true,
				get : function() { return this._row },
				set : function(r) {
					var tiles = this._parent._tiles;
					var coords = this._row + ':' + this._col;
					if (tiles[coords] == this) delete tiles[coords];
					tiles[r + ':' + this._col] = this;

					this._row = r;
					this.y = this._parent._y + r * this._h;
				}
			},
			_col : {},
			col : {
				configurable : true,
				enumerable : true,
				get : function() { return this._col },
				set : function(c) {
					var tiles = this._parent._tiles;
					var coords = this._row + ':' + this._col;
					if (tiles[coords] == this) delete tiles[coords];
					tiles[this._row + ':' + c] = this;

					this._col = c;
					this.x = this._parent._x + c * this._w;
				}
			},
			w : W,
			h : H
		});
	},
	place : function(grid, row, col) {
		grid.attach(this);
		if (row) this.row = row;
		if (col) this.col = col;
		return this;
	},
	at : function(row, col) {
		if (row !== undefined && col !== undefined) {
			this.row = row;
			this.col = col;
			return this;
		}
		return { row : this.row, col : this.col }
	}
});
/*
Tiles = {
	unit : { width : 32, height : 32 },
	default : {
		color : 'rgba(0,0,0,0)'
	},
	load : function(url, success, error) {
		Ajax.get(url).success(function(data) {
			var name = (data.name || url).trim();
			var codename = name.replace(/\s/g, '_');
			var rows = data.rows || data.tiles.length;
			var cols = data.cols;
			if (!cols) {
				// initialize `cols` to largest row
				for (var i = 0; i < rows; i++) {
					cols = Math.max(cols, tiles[i].length);
				}
			}
			var unit = {
				width : Tiles.unit.width,
				height : Tiles.unit.height
			}
			var default = data.default;
			if (default) {
				if (default.width) {
					delete deafult.width;
					unit.width = default.width;
				}
				if (default.height) {
					delete default.height;
					unit.height = default.height;
				}
			}

			var palette = data.palette;
			for (var k in palette) {
				if (palette.hasOwnProperty(k)) {
					var tile = palette[k];
					Crafty.c('Tiles:' + codename + '.' + k, {
						name : tile.name,
						init : function() {
							this.requires('Tile');
							if (tile.color) {
								this.requires('Color,Canvas').color(tile.color);
							}
						}
					});
				}
			}

			Crafty.c('Tiles:' + codename, {
				name : name,
				description : data.description,
				rows : rows,
				cols : cols,
				unit : unit,
				palette : palette,
				tiles : data.tiles,
				default : default,
				init : function() {
					for (var y = 0; y < this.rows; y++) {
						for (var x = 0; x < this.cols; x++) {
							var tile = this.tiles[y][x];
							if (tile) {
								var e = Crafty.e('Tiles:' + codename + '.' + tile)
								if (e) {
									this.attach(e.coord(x, y));
									e.w = unit.width;
									e.h = unit.height;
								}
							}
						}
					}
				}
			})
		}).error(function(err) {
			if (typeof err === 'number') {
				if (err >= 500) {
					console.log('Server error : ', err);
				} else if (err >= 400) {
					console.log('Not available : ', err);
				}
			} else {
				console.log('Malformed data\n', err);
			}
		});
	},
	display : function(mapName) {
		var codename = name.replace(/\s/g, '_');
		return Crafty.e('Tiles:' + codename)
	}
}

function tileMapDemo() {
	Crafty.init();
	Tiles.load('map.json');
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
		var f = 0, x, y;
		if (Crafty.keydown[k = Crafty.keys.UP_ARROW]) {
			f++;
			if (frames % 2 == 0) Crafty.viewport.y = Math.min(0, Crafty.viewport._y + tile.h / 2);
		}
		if (Crafty.keydown[k = Crafty.keys.RIGHT_ARROW]) {
			f++;
			if (frames % 2 == 0) Crafty.viewport.x = Math.max(-Tiles.current.size.cols * tile.w + Crafty.viewport._width, Crafty.viewport._x - tile.w / 2);
		}
		if (Crafty.keydown[k = Crafty.keys.DOWN_ARROW]) {
			f++;
			if (frames % 2 == 0) Crafty.viewport.y = Math.max(-Tiles.current.size.rows * tile.h + Crafty.viewport._height, Crafty.viewport._y - tile.h / 2);
		}
		if (Crafty.keydown[k = Crafty.keys.LEFT_ARROW]) {
			f++;
			if (frames % 2 == 0) Crafty.viewport.x = Math.min(0, Crafty.viewport._x + tile.w / 2);
		}

		if (f) frames++;
	});
	Crafty.bind('StartDrag', function(e) {
		console.log(e);
	});
}
*/

function tiledDemo() {

	var colors = ['red', 'green', 'blue'];

	Crafty.init();
	var xtiles = 10;
	var ytiles = 10;

	var grid = Crafty.e('Grid');
	for (var x = 0; x <= xtiles; x++) {
		for (var y = 0; y <= ytiles; y++) {
			var color = Crafty.math.randomElementOfArray(colors);
			grid.tileAt(y, x).requires('Canvas, Color').color(color);
		}
	}
}
