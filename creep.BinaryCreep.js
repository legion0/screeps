/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.BinaryCreep');
 * mod.thing == 'a thing'; // true
 */

class BinaryCreep extens Creep {
  constructor(height, width) {
    this.height = height;
    this.width = width;
  }
}

module.exports = BinaryCreep;
