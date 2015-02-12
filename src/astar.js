Graph = {
	grid : function(grid, opts) { return new GridBackedGraph(grid, opts) }
}

function Node(data, graph) {
	this._data = data;
	this._graph = graph;
	this.init();

	P(this).get('neighbors', function() {
		if (this._neighbors) return this._neighbors;
		return this._neighbors = this._graph.neighbors(this);
	});
}
Node.prototype.init = function() {
	this.f = 0;
	this.g = 0;
	this.h = 0;
	this.visited = false;
	this.closed = false;
	this.parent = null;
};
Node.prototype.costTo = function(node) {
	return this._graph.cost(this, node);
};
Node.prototype.visit = function(from, g, h) {
	this.visited = true;
	this.parent = from;
	this.g = g;
	this.h = h;
	this.f = g + h;
	this._graph.mark(this);
};

function GridBackedGraph(grid, opts) {
	var $grid = this._grid = [];
	opts = opts || {};
	var weight = opts.weight || function() { return 1 };
	if (opts.cost) this._cost = opts.cost;
	for (var r = 0, rows = grid.length; r < rows; r++) {
		var row = grid[r];
		var $row = [];
		for (var c = 0, cols = row.length; c < cols; c++) {
			var node = $row[c] = new Node(row[c], this);
			node.row = r;
			node.col = c;
			node.weight = weight(row[c]);
		}
		$grid.push($row);
	}
	this._dirty = [];
}
GridBackedGraph.prototype.nodeAt = function(row, col) {
	return this._grid[row][col];
};
GridBackedGraph.prototype._cost = function(from, to) {
	return to.weight;
};
GridBackedGraph.prototype.cost = function(from, to) {
	var direction = Math.abs(from.row - to.row) + Math.abs(from.col - to.col);
	switch (direction) {
	case 0: return 0;
	case 1: return this._cost(from, to);
	case 2: return 1.4142 * this._cost(from, to);
	}
};
GridBackedGraph.prototype.mark = function(node) {
	this._dirty.push(node);
};
GridBackedGraph.prototype.cleanup = function() {
	for (var i = 0, l = this._dirty.length; i < l; i++) {
		this._dirty[i].init();
	}
};
GridBackedGraph.prototype.neighbors = function(node) {
	var neighbors = [];
	var row = node.row, col = node.col, grid = this._grid, r, n;
	if ((r = grid[row - 1]) && (n = r[col])) neighbors.push(n);
	if ((r = grid[row - 1]) && (n = r[col + 1])) neighbors.push(n);
	if ((r = grid[row]) && (n = r[col + 1])) neighbors.push(n);
	if ((r = grid[row + 1]) && (n = r[col + 1])) neighbors.push(n);
	if ((r = grid[row + 1]) && (n = r[col])) neighbors.push(n);
	if ((r = grid[row + 1]) && (n = r[col - 1])) neighbors.push(n);
	if ((r = grid[row]) && (n = r[col - 1])) neighbors.push(n);
	if ((r = grid[row - 1]) && (n = r[col - 1])) neighbors.push(n);
	return neighbors;
};

AStar = function AStar(graph, opts) {
	this._graph = graph;
	if (opts) {
		if (typeof opts.heuristic === 'function') this._heuristic = opts.heuristic;
		if (opts.breakTies) this._tb = 1.001;
	}
}
AStar.Manhattan = function(from, to) {
	var dy = to.row - from.row, dx = to.col - from.col;
	return Math.abs(dx) + Math.abs(dy);
};
AStar.Chebyshev = function(from, to) {
	var dy = to.row - from.row, dx = to.col - from.col;
	return (dx + dy) - 0.5858 * Math.min(dx, dy);
};
AStar.Euclidean = function(from, to) {
	var dy = to.row - from.row, dx = to.col - from.col;
	return Math.sqrt(dx * dx + dy * dy);
};
AStar.prototype._tb = 1;
AStar.prototype._heuristic = AStar.Chebyshev;
AStar.prototype.heuristic = function(from, to) {
	return this._tb * this._heuristic(from, to);
};
AStar.pathTo = function(node) {
	var path = [node], curr = node;
	while (curr = curr.parent) {
		path.push(curr);
	}
	return path.reverse();
};
AStar.prototype.search = function(src, dest) {
	this._graph.cleanup();
	var open = new BinaryHeap([src], function(l, r) { return l.f <= r.f });
	var closest = src;
	src.h = this.heuristic(src, dest);
	while (!open.isEmpty) {
		var curr = open.pop();
		if (curr === dest) return AStar.pathTo(curr);
		curr.closed = true;
		var neighbors = curr.neighbors;
		for (var i = 0, nl = neighbors.length; i < nl; i++) {
			var neighbor = neighbors[i];
			if (neighbor.closed || neighbor.impassable) {
				continue;
			}
			var g = curr.g + curr.costTo(neighbor);
			var visited = neighbor.visited;
			if (!visited || g < neighbor.g) {
				var h = neighbor.h || this.heuristic(neighbor, dest);
				neighbor.visit(curr, g, h);
				if (h < closest.h || (h === closest.h && neighbor.g < closest.g)) {
					closest = neighbor;
				}
				if (!visited) {
					open.push(neighbor);
				} else {
					open.upscore(neighbor);
				}
			}
		}
	}
	var path = AStar.pathTo(closest);
	path.incomplete = true;
	return path;
}
