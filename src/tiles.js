function Palette(data) {
	this.name = (data.name || 'palette_' + (++Palette.uuid)).trim().replace(/[\s,]/g, '_');
	this._terrain = {};
	if (typeof data.terrain === 'object') {
		var terrain = data.terrain;
		for (var code in terrain) {
			if (terrain.hasOwnProperty(code)) {
				if (this._terrain[code])
					console.log('WARNING [' + this.name +'] duplicate terrain code "' + code + '"!');
				var component = this._terrain[code] = this.name + '#' + (++Palette.tuid);
				var spec = terrain[code];
				if (spec.color) {
					this.color(component, spec);
				} else if (t.sprite) {
					this.sprite(component, spec);
				}
			}
		}
	}
	if (typeof data.features === 'object') {
		this._features = features;
	}
}
Palette.uuid = 0;
Palette.tuid = 0;
Palette.fuid = 0;
Palette.prototype.color = function(code, spec) {
	return Crafty.c(code, {
		init : function() {
			this.requires('Grid, Canvas, Color').color(spec.color);
			if (spec.size) this.size(spec.size);
		},
		_mapspec : spec
	});
};
Palette.prototype.sprite = function(code, spec) {
	throw new Error('Unsupported operation.');
	return Crafty.c(this.name + '#' + code, {
		init : function() {
			this.requires('Grid, Canvas, Color').color(spec.color);
			if (spec.size) this.size(spec.size);
		},
		_mapspec : spec
	});
	
};
Palette.prototype.terrain = function(code) {
	return Crafty.e(this._terrain[code]);
}

function Map(opt) {
	P(this)
		('hidden sealed').def('_terrain')
		('hidden sealed').def('_features')
		('hidden sealed').def('_palette')
		('hidden sealed').def('_rows', 0)
		('hidden sealed').def('_cols', 0)
		('hidden sealed').def('_showing')
//		('hidden sealed').constant('_astar', new EasyStar.js);

	if (typeof opt === 'object') {
		if (typeof opt.rows === 'number' && typeof opt.cols === 'number') {
			this.size(opt.rows, opt.cols);
		}
		if (opt.terrain instanceof Array) {
			this.terrain(opt.terrain);
		}
		if (opt.features instanceof Array) {
			this.features(opt.features);
		}
		if (opt.palette instanceof Palette) {
			this.palette(opt.palette);
		}
	}
}
Map.unit = { w : 32, h : 32 };
Map.prototype.size = function(rows, cols) {
	if (typeof rows === 'undefined' && typeof cols === 'undefined') {
		return { rows : this._rows, cols : this._cols };
	}
	this._rows = rows || this._rows;
	this._cols = cols || this._cols;
	return this;
}
Map.prototype.terrain = function(tiles) {
	if (!tiles) return this._terrain;
	this._terrain = [];
	var cols = 0;
	for (var r = 0; r < tiles.length; r++) {
		var row = [];
		for (var c = 0; c < tiles[r].length; c++) {
			row[c] = tiles[r][c];
			cols = Math.max(cols, tiles[r].length);
		}
		this._terrain.push(row);
	}
	if (!this._rows) this._rows = tiles.length;
	if (!this._cols) this._cols = cols;
	return this;
}
Map.prototype.terrainAt = function(row, col, tile) {
	if (!tile) return this._grid._terrain[row + ':' + col];
	this._terrain[row][col] = tile;
	if (this._showing) {
	var t = this._grid._terrain[row + ':' + col];
	if (t) t.destroy();
		this._grid._terrain[row + ':' + col] = this._palette.terrain(tile);
	}
},
Map.prototype.features = function(tiles) {
	if (!tiles) return this._features;
	this._features = [];
	var cols = 0;
	for (var r = 0; r < tiles.length; r++) {
		var row = [];
		for (var c = 0; c < tiles[r].length; c++) {
			row[c] = tiles[r][c];
			cols = Math.max(cols, tiles[r].length);
		}
		this._features.push(row);
	}
	if (!this._rows) this._rows = tiles.length;
	if (!this._cols) this._cols = cols;
	return this;
}
Map.prototype.palette = function(palette) {
	if (!palette) return this._palette;
	this._palette = palette;
	return this;
}
Map.prototype.show = function() {
	if (this._showing) return;

	var terrain = this._terrain;
	var features = this._features;
	if (!terrain && !features) throw new Error('Map terrain or features must be defined');
	var palette = this._palette;
	if (!palette) throw new Error('Map palette must be defined');

	var grid = this._grid = Crafty.e('GridSpace');
	P(grid)
		('hidden sealed').constant('_terrain', {})
		('hidden sealed').constant('_features', {});
	for (var r = 0; r < this._rows; r++) {
		for (var c = 0; c < this._cols; c++) {
			var key, entity, coords = r + ':' + c;
			if (terrain) {
				key = terrain[r][c];
				entity = palette.terrain(key).coords(r, c);
				if (entity) {
					grid.attach(entity);
					grid._terrain[coords] = entity;
				}
			}
			if (features) {
				key = features[r][c];
				entity = palette.features(key).coords(r, c);
				if (entity) {
					grid.attach(entity);
					grid._features[coords] = entity;
				}
			}
		}
	}

	this._showing = true;

	var width = this._rows * Map.unit.h, height = this._cols * Map.unit.w;
	Crafty.viewport.bounds = {
		min : { x : 0, y : 0 },
		max : { x : width, y : height }
	};
	grid.bind('Move', function() {
		Crafty.viewport.bounds = {
			min : { x : grid._x, y : grid._y },
			max : { x : grid._x + width, y : grid._y + height }
		}
	});
}
Map.prototype.hide = function() {
	if (!this._showing) return;
	this._grid.destroy();
	this._showing = false;
	Crafty.viewport.bounds = null;
}

Crafty.c('GridSpace', {
	init : function() {
		this.requires('2D');
	},
});

Crafty.c('Grid', {
	init : function() {
		var self = this.requires('2D')
			.coords(0, 0)
			.size(1, 1);

		P(this)
			('hidden sealed').def('_coords');
	},
	coords : function(row, col) {
		if (typeof row === 'undefined' && typeof col === 'undefined') {
			return this._coords;
		}
		this._coords = { row : row, col : col };
		if (this._parent) {
			this.y = this._parent._y;
			this.x = this._parent._x;
		}
		this.y += row * Map.unit.h;
		this.x += col * Map.unit.w;
		return this;
	},
	size : function(rows, cols) {
		if (typeof rows === 'undefined' && typeof cols === 'undefined') {
			return { rows : ~~(this._h / Map.unit.h), cols : ~~(this._w / Map.unit.w) };
		}
		this.h = rows * Map.unit.h;
		this.w = cols * Map.unit.w;
	}
});

Tiles = {
	_maps : {},
	_palettes : {},
	load : function(url, success, error) {
		if (typeof success !== 'function') {
			success = function() {};
		}
		if (typeof error !== 'function') {
			error = function() {};
		}

		var map;
		if (url in Tiles._maps) {
			map = Tiles._maps[url];
			success(map);
		} else {
			Ajax.get(url).success(function(mapData) {

				var palette = mapData.palette;
				if (typeof palette === 'string') {
					var paletteUrl = palette;
					if (paletteUrl in Tiles._palettes) {
						mapiData.palette = Tiles._palettes[paletteUrl];
						map = Tiles._maps[url] = new Map(mapData);
						success(map);
					} else {
						Ajax.get(paletteUrl).success(function(paletteData) {
							mapData.palette = Tiles._palettes[paletteUrl] = new Palette(paletteData);
							map = Tiles._maps[url] = new Map(mapData);
							success(map);
						})
						.error(error);
					}
				} else {
					mapData.palette = new Palette(palette);
					map = Tiles._maps[url] = new Map(mapData);
					success(map);
				}
			})
			.error(error);
		}
	}
}

function tiledDemo() {

	Crafty.init();
	Crafty.viewport.mouselook(true);

	Tiles.load('map.json', function(map) {
		console.log('loading...');
		map.show();
		console.log('done.');
	})
}
