const worldSize = 102;
const ROOM_WIDTH = 50;


const halfWorld = Math.ceil(worldSize / 2);
const maxWorldCord = worldSize * ROOM_WIDTH;

class RoomPosition {
	x: number;
	y: number;
	roomName: string;
	constructor(x: number, y: number, roomName: string) {
		this.x = x;
		this.y = y;
		this.roomName = roomName;
	}
}

function roomNameToXY(name: string): [number, number] {
	let match = name.match(/^(\w)(\d+)(\w)(\d+)$/);
	if (!match) {
		return null;
	}
	let [, hor, xStr, ver, yStr] = match;
	let x = hor == 'W' ? Number(xStr) + halfWorld : Number(xStr);
	let y = ver == 'N' ? Number(yStr) + halfWorld : Number(yStr);
	return [x, y];
}

function getRoomNameFromXY(x: number, y: number) {
	let xStr = x >= halfWorld ? 'W' + (x - halfWorld) : 'E' + x;
	let yStr = y >= halfWorld ? 'N' + (y - halfWorld) : 'S' + y;
	return xStr + yStr;
}

export function fromMemoryWorld(memory: number): RoomPosition {
	let worldY = memory % maxWorldCord;
	let worldX = (memory - worldY) / maxWorldCord;
	let x = worldX % ROOM_WIDTH;
	let roomX = (worldX - x) / ROOM_WIDTH;
	let y = worldY % ROOM_WIDTH;
	let roomY = (worldY - y) / ROOM_WIDTH;
	let roomName = getRoomNameFromXY(roomX, roomY);
	return new RoomPosition(x, y, roomName);
}

export function toMemoryWorld(pos: RoomPosition): number {
	if (pos instanceof RoomPosition) {
		let roomXY = roomNameToXY(pos.roomName);
		let worldX = roomXY[0] * ROOM_WIDTH + pos.x;
		let worldY = roomXY[1] * ROOM_WIDTH + pos.y;
		return worldX * maxWorldCord + worldY;
	}
	return null;
}

export function toMemoryRoom(pos: RoomPosition): number {
	if (pos instanceof RoomPosition) {
		return pos.x * ROOM_WIDTH + pos.y;
	}
	return null;
}

export function fromMemoryRoom(memory: number, roomName: string): RoomPosition {
	let y = memory % ROOM_WIDTH;
	let x = (memory - y) / ROOM_WIDTH;
	return new RoomPosition(x, y, roomName);
}


test('toMemoryRoom', () => {
	for (let x = 0; x < ROOM_WIDTH; x++) {
		for (let y = 0; y < ROOM_WIDTH; y++) {
			// console.log('.');
			let pos = new RoomPosition(x, y, 'W0N0');
			expect(fromMemoryRoom(toMemoryRoom(pos), 'W0N0')).toMatchObject(pos);
		}
	}
})

// test('toMemoryWorld', () => {
// 	for (let roomX = 0; roomX < halfWorld; roomX++) {
// 		for (let roomY = 0; roomY < halfWorld; roomY++) {
// 			for (let x = 0; x < ROOM_WIDTH; x++) {
// 				for (let y = 0; y < ROOM_WIDTH; y++) {
// 					// console.log('.');
// 					let pos = new RoomPosition(x, y, 'W' + roomX + 'N' + roomY);
// 					expect(fromMemoryWorld(toMemoryWorld(pos))).toMatchObject(pos);
// 					pos = new RoomPosition(x, y, 'E' + roomX + 'S' + roomY);
// 					expect(fromMemoryWorld(toMemoryWorld(pos))).toMatchObject(pos);
// 				}
// 			}
// 		}
// 	}
// })
