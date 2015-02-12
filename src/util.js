var funargs = /^\s*function(?:\s+\w+)?\s*\(([^\)]*)\)/;
P = function P(obj) {
	var opt = { enumerable : true, configurable : true, writable : true };

	function cmd(mods) {
		if (arguments.length > 1) {
			mods = Array.prototype.slice.call(arguments)
		} else if (typeof mods === 'string') {
			mods = mods.split(/[, ]+/g)
		} else if (!(mods instanceof Array)) {
			var ms = []
			for (var m in mods) {
				if (mods.hasOwnProperty(m) && mods[m]) {
					ms.push(m);
				}
			}
			mods = ms;
		}
		for (var m in mods) {
			if (mods[m] === 'hidden') {
				opt.enumerable = false;
			} else if (mods[m] === 'sealed') {
				opt.configurable = false;
			}
		}
		return cmd
	}
	cmd.def = function(prop, o) {
		var pdesc = Object.getOwnPropertyDescriptor(obj, prop)
		if (pdesc && !pdesc.configurable) {
			return;
		}
		switch (typeof o) {
		case 'object':
			for (var k in o) {
				if (o.hasOwnProperty(k)) {
					opt[k] = o[k];
				}
			}
			break;
		case 'function':
			opt.get = o;
			delete opt.writeable;
			break;
		default:
			opt.value = o;
		}
		Object.defineProperty(obj, prop, opt);
		opt = { enumerable : true, configurable : true, writable : true };
		return cmd;
	};
	cmd.get = function(prop, get) {
		var pdesc = Object.getOwnPropertyDescriptor(obj, prop)
		if (pdesc && !pdesc.configurable) {
			return;
		}
		opt.get = get;
		delete opt.writable;
		Object.defineProperty(obj, prop, opt);
		opt = { enumerable : true, configurable : true, writable : true };
		return cmd;
	};
	cmd.getset = function(prop, hprop, get, set) {
		var pdesc = Object.getOwnPropertyDescriptor(obj, prop)
		if (pdesc && !pdesc.configurable) {
			return;
		}
		switch (arguments.length) {
		case 1:
			hprop = '_' + prop;
			break;
		case 2:
			switch (typeof hprop) {
			case 'string':
				break;
			case 'function':
				var m = funargs.exec(hprop.toString());
				if (m && m[1].trim().length) {
					// function is a setter
					set = hprop;
				} else {
					// function is a getter
					get = hprop;
				}
				hprop = '_' + prop;
				break;
			case 'object':
				var gs = hprop;
				hprop = '_' + prop;
				get = gs.get;
				set = gs.set;
			}
			break;
		case 3:
			switch (typeof hprop) {
			case 'boolean':
				if (hprop) hprop = '_' + prop;
			case 'string':
				switch (typeof get) {
				case 'function':
					var m = funargs.exec(get.toString());
					if (m && m[1].trim().length) {
						// function is a setter
						set = get;
						get = void undefined;
					}
					break;
				case 'object':
					var gs = get;
					get = gs.get;
					set = gs.set;
				}
				break;
			case 'function':
				if (typeof get === 'function') {
					set = get;
					get = hprop;
					hprop = '_' + prop;
				}
			}
			break;
		case 4:
			if (hprop === true) {
				hprop = '_' + prop;
			}
		}
		if (hprop !== false) P(obj)('hidden').def(hprop);
		delete opt.writable;
		opt.get = get || (hprop !== false ? new Function('return this.' + hprop) : void undefined);
		opt.set = set || (hprop !== false ? new Function('v', 'this.' + hprop + '=v') : void undefined);
		Object.defineProperty(obj, prop, opt);
		opt = { enumerable : true, configurable : true, writable : true };
		return cmd;
	};
	cmd.constant = function(prop, val) {
		var pdesc = Object.getOwnPropertyDescriptor(obj, prop)
		if (pdesc && !pdesc.configurable) {
			return;
		}
		if (typeof val !== 'undefined') {
			opt.value = val;
		}
		opt.writable = false;
		Object.defineProperty(obj, prop, opt);
		opt = { enumerable : true, configurable : true, writable : true };
		return cmd;
	}
	return cmd
}
Properties = {
	private : function(obj, key) {
		Object.defineProperty(obj, key, { enumerable : false })
	},
	readonly : function(obj, key, value) {
		Object.defineProperty(obj, key, {
			get : function() { return value },
			configurable : true,
			enumerable : true
		})
	},
	readwrite : function(obj, key) {
		var private = '_' + key;
		Properties.private(private);
		Object.defineProperty(obj, key, {
			get : function() { return this[private] },
			set : function(v) { this[private] = v },
			configurable : true,
			enumerable : true
		})
	}
}

Ajax = {
	get : function(url) {
		var promise = {
			success : function(fn) {
				promise._success = fn;
				return promise;
			},
			error : function(fn) {
				promise._error = fn;
				return promise;
			},
			_error : function(err) {
				if (typeof err === 'number') {
					if (err >= 500) {
						console.log('Server error : ', err);
					} else if (err >= 400) {
						console.log('Not available : ', err);
					}
				} else {
					console.log('Malformed data\n', err);
				}
			}
		}

		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				var status = xhr.status;
				if (status < 400) {
					try {
						var map = JSON.parse(xhr.responseText);
					} catch (err) {
						if (typeof promise._error === 'function') {
							promise._error(err);
						}
					}
					if (typeof promise._success === 'function') {
						promise._success(map);
					}
				} else {
					if (typeof promise._error === 'function') {
						promise._error(status);
					}
				}
			}
		};
		xhr.open('GET', url, true);
		xhr.send();
	
		return promise;
	}
}

BinaryHeap = function BinaryHeap(nodes, comparator) {
	if (arguments.length === 1 && typeof nodes === 'function') {
		comparator = nodes;
		nodes = undefined;
	}
	this._comparator = comparator || function(l, r) { return l <= r };
	if (!nodes) {
		this._nodes = [ undefined ];
	} else {
		nodes = this._nodes = [ undefined ].concat(nodes);
		for (var i = nodes.length; i > 0; i--) {
			this.downHeap(i);
		}
	}
	Object.defineProperties(this, {
		size : {
			enumerable : true,
			configurable : false,
			get : function() { return this._nodes.length - 1 }
		},
		isEmpty : {
			enumerable : true,
			configurable : false,
			get : function() { return this._nodes.length === 1 }
		}
	});
}
BinaryHeap.prototype.pop = function() {
	var nodes = this._nodes;
	var min = nodes[1];
	if (min !== undefined) {
		nodes[1] = nodes.pop();
		this.downHeap(1);
		return min;
	}
};
BinaryHeap.prototype.push = function(node) {
	var nodes = this._nodes;
	var i = nodes.length;
	nodes.push(node);
	this.upHeap(i);
};
BinaryHeap.prototype.upscore = function(node) {
	this.upHeap(this._nodes.indexOf(node));
};
BinaryHeap.prototype.upHeap = function(i) {
	var nodes = this._nodes, len = nodes.length;
	var compare = this._comparator;
	while (i > 1) {
		var ip = ~~(i / 2);
		var curr = nodes[i], par = nodes[ip];
		if (compare(par, curr)) {
			break;
		}
		nodes[ip] = curr;
		nodes[i] = par;
		i = ip;
	}
};
BinaryHeap.prototype.downHeap = function(i) {
	var nodes = this._nodes, len = nodes.length;
	var compare = this._comparator;
	while (i < len) {
		var il = i * 2, ir = il + 1;
		var curr = nodes[i], left = nodes[il], right = nodes[ir];
		if (ir >= len) {
			if (il < len) {
				if (compare(left, curr)) {
					nodes[i] = left;
					nodes[il] = curr;
				}
			}
			break;
		} else {
			var min, imin;
			if (compare(left, right)) {
				min = left;
				imin = il;
			} else {
				min = right;
				imin = ir;
			}

			if (compare(curr, min)) {
				break;
			}
			nodes[i] = min;
			nodes[imin] = curr;
			i = imin;
		}
	}
}
BinaryHeap.prototype.toString = function() {
	var len = this._nodes.length;
	while (len < 0 || (len & (len - 1))) len++;
	var space = new Array(len).join(' ');
	var buffer = '';
	for (var i = 1, row = 1; i < this._nodes.length; i++, row--) {
		if (row === 0) {
			console.log(buffer);
			buffer = '';
			space = new Array(len / i).join(' ');
			row = i;
		}
		var pad = String(this._nodes[i]).length, lpad = ~~(pad / 2), rpad = pad - lpad + 1;
		buffer += space.substr(lpad) + this._nodes[i] + new Array(rpad).join(' ') + space;
	}
	console.log(buffer);
}
