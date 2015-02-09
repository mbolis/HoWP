var funargs = /^\s*function(?:\s+\w+)?\s*\(([^\)]*)\)/;
function P(obj) {
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
		for (var m of mods) {
			if (m === 'hidden') {
				opt.enumerable = false;
			} else if (m === 'sealed') {
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
						if (typeof promise._success === 'function') {
							promise._success(map);
						}
					} catch (err) {
						if (typeof promise._error === 'function') {
							promise._error(err);
						}
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

