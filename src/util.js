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

