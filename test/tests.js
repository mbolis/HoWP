/* BinaryHeap */
test('BinaryHeap is present', function() {
	ok(typeof BinaryHeap !== 'undefined', 'BinaryHeap constructor exists');
});

var maxHeap = function(l, r) { return l > r };
test('BinaryHeap constructor', function() {
	var heap1 = new BinaryHeap();
	deepEqual(heap1._nodes, [undefined], 'Default constructor creates an empty heap');

	var heap2 = new BinaryHeap([1, 2, 3]);
	deepEqual(heap2._nodes, [undefined, 1, 2, 3], 'Node array constructor creates a heap containing all nodes');

	var heap3 = new BinaryHeap(maxHeap);
	equal(heap3._comparator, maxHeap, 'Comparator constructor creates a heap with given sorting');

	var heap4 = new BinaryHeap([1, 2, 3], maxHeap);
	deepEqual(heap4._nodes, [undefined, 3, 2, 1], 'Full constructor creates a heap containing all nodes, sorted');
	equal(heap4._comparator, maxHeap, 'Full constructor creates a heap with given sorting');
});

test('Heap properties', function() {
	var nodes = new BinaryHeap([7, 4, 6, 2, 3, 1, 5, 9, 8, 0], maxHeap)._nodes;
	var layersAreFull = nodes.slice(1).every(function(e) { return e !== undefined });
	ok(layersAreFull, 'After construction, all layers are populated');
	var childrenAreOrdered = true;
	for (var i = 1; i < nodes.length; i++) {
		if (nodes[i * 2] !== undefined) childrenAreOrdered &= maxHeap(nodes[i], nodes[i * 2]);
		if (nodes[i * 2 + 1] !== undefined) childrenAreOrdered &= maxHeap(nodes[i], nodes[i * 2 + 1]);
	}
	ok(childrenAreOrdered, 'After construction, parents and children are sorted');
});

test('Operations : push' , function() {
	var heap1 = new BinaryHeap([7, 4, 6, 2, 3, 1, 5, 9, 8, 0]);
	var nodes1 = heap1._nodes;
	heap1.push(-1);
	var pushed1 = nodes1[1] === -1;
	pushed1 &= nodes1.slice(1).every(function(e) { return e !== undefined });
	for (var i = 1; i < nodes1.length; i++) {
		if (nodes1[i * 2] !== undefined) pushed1 &= nodes1[i] <= nodes1[i * 2];
		if (nodes1[i * 2 + 1] !== undefined) pushed1 &= nodes1[i] <= nodes1[i * 2 + 1];
	}
	ok(pushed1, 'Push new root into a full heap');

	var heap4 = new BinaryHeap([7, 4, 6, 2, 3, 1, 5, 9, 8, 0]);
	var nodes4 = heap4._nodes;
	heap4.push(5);
	var pushed4 = !!~nodes4.indexOf(5);
	pushed4 &= nodes4.slice(1).every(function(e) { return e !== undefined });
	for (var i = 1; i < nodes4.length; i++) {
		if (nodes4[i * 2] !== undefined) pushed4 &= nodes4[i] <= nodes4[i * 2];
		if (nodes4[i * 2 + 1] !== undefined) pushed4 &= nodes4[i] <= nodes4[i * 2 + 1];
	}
	ok(pushed4, 'Push new branch into a full heap');

	var heap3 = new BinaryHeap([7, 4, 6, 2, 3, 1, 5, 9, 8, 0]);
	var nodes3 = heap3._nodes;
	heap3.push(10);
	var pushed3 = nodes3[nodes3.length - 1] === 10;
	pushed3 &= nodes3.slice(1).every(function(e) { return e !== undefined });
	for (var i = 1; i < nodes3.length; i++) {
		if (nodes3[i * 2] !== undefined) pushed3 &= nodes3[i] <= nodes3[i * 2];
		if (nodes3[i * 2 + 1] !== undefined) pushed3 &= nodes3[i] <= nodes3[i * 2 + 1];
	}
	ok(pushed3, 'Push new leaf into a full heap');

	var heap2 = new BinaryHeap(maxHeap);
	var nodes2 = heap2._nodes;
	heap2.push(1);
	ok(nodes2[1] === 1, 'Push new item into an empty heap');
});

test('Operations : pop' , function() {
	var heap1 = new BinaryHeap([7, 4, 6, 2, 3, 1, 5, 9, 8, 0]);
	var nodes1 = heap1._nodes;
	var node1 = heap1.pop();
	var popped1 = node1 === 0;
	popped1 &= nodes1.slice(1).every(function(e) { return e !== undefined });
	for (var i = 1; i < nodes1.length; i++) {
		if (nodes1[i * 2] !== undefined) popped1 &= nodes1[i] <= nodes1[i * 2];
		if (nodes1[i * 2 + 1] !== undefined) popped1 &= nodes1[i] <= nodes1[i * 2 + 1];
	}
	ok(popped1, 'Pop top from full heap');

	var heap2 = new BinaryHeap(maxHeap);
	var nodes2 = heap2._nodes;
	var node2 = heap2.pop();
	ok(node2 === undefined, 'Pop top from empty heap');
});

test('Operations : upscore' , function() {
	var heap1 = new BinaryHeap([7, 4, 6, 2, 3, 1, 5, 9, 8, 0]);
	var nodes1 = heap1._nodes;
	nodes1[5] = -1;
	heap1.upscore(-1);
	console.log(nodes1)
	var upscored1 = nodes1.slice(1).every(function(e) { return e !== undefined });
	for (var i = 1; i < nodes1.length; i++) {
		if (nodes1[i * 2] !== undefined) upscored1  &= nodes1[i] <= nodes1[i * 2];
		if (nodes1[i * 2 + 1] !== undefined) upscored1 &= nodes1[i] <= nodes1[i * 2 + 1];
	}
	ok(upscored1, 'Refreshed after upscoring full heap');
});
