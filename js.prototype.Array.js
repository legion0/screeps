
Array.prototype.findSortedFirst = function(sort_function) {
    if (this.length == 0) {
    	return null;
    }
    let smallest = this[0];
    for (let element of this) {
    	if (sort_function(element, smallest) < 0) {
    		smallest = element;
    	}
    }
    return smallest;
};
