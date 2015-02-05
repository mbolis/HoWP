Crafty.c('_GridRoot', {
	init : function() {
		this.requires('2D');
	}
})

Grid = {
	root : undefined,
	count : 0,
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
		this._tileCID = this._gridId + '::Tile';
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
			}
			return this;
		}

		var dtc = this.detach;
		this.detach = function(c) {
			dtc.call(this, c);
			if (c && c.has('Tile')) {
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
		var coords = '@(' + row + ':' + col + ')';
		var tile = Crafty(this._tileCID + ' ' + coords).get(); // TODO: manage multiple returns
		if (!tile.length) {
			tile = Crafty.e(this._tileCID, coords, '!')//.at(row, col);
		}
		return tile;
	}
});

var re_bang = /@\(([^\)]*)\)/;
var re_args = /:/g;

Crafty.c('!', {
	init : function() {
		var m;
		for (var c in this.__c) {
			if (m = re_bang.exec(c)) {
				var args = m[1].split(re_args);
				this['@!'].apply(this, args);
			}
		}
		this.removeComponent('!');
	}
});


Crafty.c('Tile', {
	_row : 0,
	_col : 0,
	'@!' : function(r, c) {
		this.y = this._parent._y + (this._row = +r) * this._h;
		this.x = this._parent._x + (this._col = +c) * this._w;
	},
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
					this.removeComponent('@('+this._row+':'+this._col+')')
						.addComponent('@('+r+':'+this._col+')');

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
					this.removeComponent('@('+this._row+':'+this._col+')')
						.addComponent('@('+this._row+':'+c+')');

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

function Map() {}
Map.prototype.display = function(grid) {
	var tiles = this.tiles;
	var rows = this.rows;
	var cols = this.cols;
	for (var y = 0; y < rows; y++) {
		var row = tiles[y];
		for (var x = 0; x < cols; x++) {
			var tile = this.palette[row[x]];
			grid.tileAt(y, x).requires('Canvas,Color').color(tile.color || 'rgba(0,0,0,0)')
		}
	}
}

Tiles = {
	_maps : {},
	_palettes : {},
	load : function(url, success, error) {
		var map;
		if (url in Tiles._maps) {
			map = Tiles._maps[url];
			if (typeof success === 'function') {
				success(map);
			}
		} else {
			map = Tiles._maps[url] = new Map;
			var ajax = Ajax.get(url).success(function(data) {
				var name = map.name = (data.name || url).trim();

				var tiles = map.tiles = data.tiles;

				var rows = map.rows = data.rows || data.tiles.length;
				var cols = data.cols;
				if (typeof cols !== 'number') {
					cols = 0;
					// initialize `cols` to largest row
					for (var i = 0; i < rows; i++) {
						cols = Math.max(cols, tiles[i].length);
					}
				}
				map.cols = cols;

				var palette = data.palette;
				if (typeof palette === 'string') {
					if (paletteUrl in Tiles._palettes) {
						map.palette = Tiles._palettes[paletteUrl];
						if (typeof success === 'function') {
							success(map);
						}
					} else {
						Ajax.get(paletteUrl).success(function(data) {
							map.palette = data;
							if (typeof success === 'function') {
								success(map);
							}
						})
					}
				} else {
					map.palette = palette;
					if (typeof success === 'function') {
						success(map);
					}
				}
			});
			if (typeof error === 'function') {
				ajax.error(error);
			}
		}
		return map;
	}
}

/*
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

	Crafty.init(600, 400);
	Crafty.viewport.mouselook(true);

	var grid = Crafty.e('Grid');
	Tiles.load('map.json', function(map) {
		console.log('loading...');
		map.display(grid);
		console.log('done.');
	})
}
