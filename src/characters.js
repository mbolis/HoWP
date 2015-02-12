Characters = {};

function Hero() {}
Hero.prototype.show = function(loc) {
	this._entity = Crafty.e('Character').color('red').coords(loc.row, loc.col);
	P(this)
		.get('row', function() { return this._entity._coords.row })
		.get('col', function() { return this._entity._coords.col });
	return this;
};
Hero.prototype.hide = function() {
	this._entity.destroy();
	delete this._entity;
	return this;
}

Crafty.c('Character', {
	init : function() {
		this.requires('Grid, Canvas, Color');
	}
});
