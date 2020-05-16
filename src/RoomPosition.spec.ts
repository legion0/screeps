const worldSize = 12;
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
	const match = name.match(/^(\w)(\d+)(\w)(\d+)$/u);
	if (!match) {
		return null;
	}
	const [, hor, xStr, ver, yStr] = match;
	const x = hor === 'W' ? Number(xStr) + halfWorld + 1 : Number(xStr);
	const y = ver === 'N' ? Number(yStr) + halfWorld + 1 : Number(yStr);
	return [x, y];
}

function getRoomNameFromXY(x: number, y: number) {
	const xStr = x >= halfWorld ? `W${x - halfWorld - 1}` : `E${x}`;
	const yStr = y >= halfWorld ? `N${y - halfWorld - 1}` : `S${y}`;
	return xStr + yStr;
}

export function fromMemoryWorld(memory: number): RoomPosition {
	const worldY = memory % maxWorldCord;
	const worldX = (memory - worldY) / maxWorldCord;
	const x = worldX % ROOM_WIDTH;
	const roomX = (worldX - x) / ROOM_WIDTH;
	const y = worldY % ROOM_WIDTH;
	const roomY = (worldY - y) / ROOM_WIDTH;
	const roomName = getRoomNameFromXY(roomX, roomY);
	console.log(worldY, worldX, x, roomX, y, roomY, roomName, maxWorldCord);
	return new RoomPosition(x, y, roomName);
}

export function toMemoryWorld(pos: RoomPosition): number {
	if (pos instanceof RoomPosition) {
		const roomXY = roomNameToXY(pos.roomName);
		const worldX = roomXY[0] * ROOM_WIDTH + pos.x;
		const worldY = roomXY[1] * ROOM_WIDTH + pos.y;
		console.log(pos.x, pos.y, pos.roomName, roomXY, worldX, worldY, maxWorldCord);
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
	const y = memory % ROOM_WIDTH;
	const x = (memory - y) / ROOM_WIDTH;
	return new RoomPosition(x, y, roomName);
}


/*
 * Test('toMemoryRoom', () => {
 * 	for (let x = 0; x < ROOM_WIDTH; x++) {
 * 		for (let y = 0; y < ROOM_WIDTH; y++) {
 * 			const pos = new RoomPosition(x, y, 'W0N0');
 * 			expect(fromMemoryRoom(toMemoryRoom(pos), 'W0N0')).toMatchObject(pos);
 * 		}
 * 	}
 * });
 */

test('someBug', () => {
	// W7N7_7_12 gets encoded as 394862 and decoded as W7S1_8_12 with worldSize = 12

	const pos = new RoomPosition(7, 12, 'W7N7');
	expect(fromMemoryWorld(toMemoryWorld(pos))).toMatchObject(pos);
});


/*
 * Test('toMemoryWorld', () => {
 * 	for (let roomX = 0; roomX < halfWorld; roomX++) {
 * 		for (let roomY = 0; roomY < halfWorld; roomY++) {
 * 			for (let x = 0; x < ROOM_WIDTH; x++) {
 * 				for (let y = 0; y < ROOM_WIDTH; y++) {
 * 					// Console.log('.');
 * 					let pos = new RoomPosition(x, y, `W${roomX}N${roomY}`);
 * 					expect(fromMemoryWorld(toMemoryWorld(pos))).toMatchObject(pos);
 * 					pos = new RoomPosition(x, y, `E${roomX}S${roomY}`);
 * 					expect(fromMemoryWorld(toMemoryWorld(pos))).toMatchObject(pos);
 * 				}
 * 			}
 * 		}
 * 	}
 * });
 */


