function Map(opt) {
	P(this)
		('hidden sealed').def('_terrain')
		('hidden sealed').def('_features')
		('hidden sealed').def('_palette')
		('hidden sealed').def('_rows', 0)
		('hidden sealed').def('_cols', 0)
		('hidden sealed').def('_showing');

	if (typeof opt === 'object') {
		if (opt.name) this.name = opt.name;
		if (typeof opt.rows === 'number' && typeof opt.cols === 'number') {
			this.size(opt.rows, opt.cols);
		}
		if (opt.palette instanceof Palette) {
			this.palette(opt.palette);
		}
		if (opt.terrain instanceof Array) {
			this.terrain(opt.terrain);
		}
		if (opt.features instanceof Array) {
			this.features(opt.features);
		}
		if (opt.locations instanceof Array) {
			this.locations(opt.locations);
		}
	}
	if (!this.name) this.name = 'Map_' + (++Map.uuid);
}
Map.uuid = 0;
Map.unit = { w : 32, h : 32 };
Map.prototype.size = function(rows, cols) {
	if (typeof rows === 'undefined' && typeof cols === 'undefined') {
		return { rows : this._rows, cols : this._cols };
	}
	this._rows = rows || this._rows;
	this._cols = cols || this._cols;
	return this;
};
Map.prototype.terrain = function(tiles) {
	if (!tiles) return this._terrain;
	var terrain = this._terrain = [];
	var palette = this._palette;
	var cols = 0;
	for (var r = 0; r < tiles.length; r++) {
		var row = [];
		for (var c = 0; c < tiles[r].length; c++) {
			var code = tiles[r][c];
			if (palette) {
				row[c] = palette.terrain(code);
			} else {
				row[c] = code;
			}
			cols = Math.max(cols, tiles[r].length);
		}
		this._terrain.push(row);
	}
	if (!this._rows) this._rows = tiles.length;
	if (!this._cols) this._cols = cols;
	return this;
};
Map.prototype.terrainAt = function(row, col, code) {
	if (!tile) return this._grid._terrain[row + ':' + col];
	this._terrain[row][col] = code;
	if (this._showing) {
		var t = this._grid._terrain[row + ':' + col];
		if (t) t.destroy();
		var spec = this._palette.terrain(code);
		this._grid._terrain[row + ':' + col] = Crafty.e('Tile', this.name).describe(spec).coords(r, c);
	}
};
Map.prototype.features = function(tiles) {
	throw new Error('Unsupported operation : features');
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
};
Map.prototype.locations = function(locations) {
	if (!locations) return this._locations;
	this._locations = locations;
	return this;
}
Map.prototype.palette = function(palette) {
	if (!palette) return this._palette;
	this._palette = palette;
	var terrain = this._terrain;
	if (terrain) {
		for (var r = 0, tl = terrain.length; r < tl; r++) {
			var row = terrain[r];
			for (var c = 0, rl = row.length; c < rl; c++) {
				var cell = row[c];
				switch (typeof cell) {
					case 'number':
					case 'string':
						row[c] = palette.terrain(cell);
						break;
					case 'object':
						if (cell.code !== undefined) {
							row[c] = palette.terrain(cell.code);
						}
				}
			}
		}
	}
	return this;
};
Map.prototype.show = function() {
	if (this._showing) return;

	var terrain = this._terrain;
	var features = this._features;
	if (!terrain && !features) throw new Error('Map terrain or features must be defined');
	var palette = this._palette;
	if (!palette) throw new Error('Map palette must be defined');

	var grid = this._grid = Crafty.e('GridSpace', this.name);
	P(grid)
		('hidden sealed').constant('_terrain', {})
		('hidden sealed').constant('_features', {});
	for (var r = 0; r < this._rows; r++) {
		for (var c = 0; c < this._cols; c++) {
			var spec, entity, coords = r + ':' + c;
			if (terrain) {
				spec = terrain[r][c];
				entity = Crafty.e('Tile', this.name).describe(spec).coords(r, c);
				grid.attach(entity);
				grid._terrain[coords] = entity;
			}
			if (features) {
				spec = features[r][c];
				entity = Crafty.e('Tile', this.name).describe(spec).coords(r, c);
				grid.attach(entity);
				grid._features[coords] = entity;
			}
		}
	}

	var graph = Graph.grid(terrain, {
		weight : function(node) { return node.movement || 1 }
	});
	var astar = this._astar = new AStar(graph, { breakTies : true });

	var locations = this._locations || [];
	var hero = Characters.hero;
	if (hero) {
		var loc = Crafty.math.randomElementOfArray(
				locations.filter(function(l) { return l.name === 'hero start' })) || { row : 0, col : 0 };
		hero.show(loc);

		var trace;
		Crafty('Tile,' + this.name).bind('Click', function(e) {
			
			if (View.dropped) return;

			var row = ~~(e.realY / Map.unit.h), col = ~~(e.realX / Map.unit.w);
			var path = astar.search(graph.nodeAt(hero.row, hero.col), graph.nodeAt(row, col));
			if (path && !path.incomplete) {
				if (trace) trace.destroy();
				trace = Crafty.e('2D');
				var node, step;
				for (var i = 1, pl = path.length - 1; i < pl; i++) {
					node = path[i];
					step = Crafty.e('Grid, Canvas, Color')
						.coords(node.row, node.col)
						.attr({ w : 0.5 * Map.unit.w, h : 0.5 * Map.unit.h })
						.color('#349922')
						.origin('center');
					step.x += 0.25 * Map.unit.w;
					step.y += 0.25 * Map.unit.h;
					step.rotation = 45;
					trace.attach(step);
				}
				node = path[path.length - 1];
				step = Crafty.e('Grid, Canvas, Color')
					.coords(node.row, node.col)
					.attr({ w : 0.7 * Map.unit.w, h : 0.7 * Map.unit.h })
					.color('#349922');
				step.x += 0.15 * Map.unit.w;
				step.y += 0.15 * Map.unit.h;
				trace.attach(step);
			}
		})
		//.bind('MouseDown', viewGrab)
		//.bind('MouseMove', viewDrag)
		//.bind('MouseUp', viewDrop);
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
	return this;
};
Map.prototype.hide = function() {
	if (!this._showing) return;
	this._grid.destroy();
	this._showing = false;
	Crafty.viewport.bounds = null;
};

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

function Palette(data) {
	this.name = (data.name || 'palette_' + (++Palette.uuid)).trim().replace(/[\s,]/g, '_');
	this._terrain = {};
	if (typeof data.terrain === 'object') {
		var terrain = data.terrain;
		for (var code in terrain) {
			if (terrain.hasOwnProperty(code)) {
				if (this._terrain[code])
					console.log('WARNING [' + this.name +'] duplicate terrain code "' + code + '"!');

				var spec = terrain[code];
				this._terrain[code] = spec;
				spec.code = code;
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
Palette.prototype.terrain = function(code) {
	return this._terrain[code];
}

Crafty.c('Tile', {
	init : function() {
		this.requires('Grid, Canvas, Mouse');
	},
	describe : function(spec) {
		if (spec.color) {
			this.requires('Color').color(spec.color);
		} else if (spec.sprite) {
			throw new Error('Unsupported operation : tile sprite');
		}
		if (spec.size) {
			this.size(spec.size);
		}
		return this;
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
