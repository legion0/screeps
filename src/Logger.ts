import { memInit } from './Memory';

declare global {
	interface Memory {
		logger: {
			printLevel: LogLevel;
		};
	}
}

enum LogLevel {
	QUIET,
	FATAL,
	ERROR,
	WARN,
	INFO,
	VERBOSE,
	DEBUG,
	DEBUG2,
	DEBUG3,
}

(global as any).LogLevel = LogLevel;

const LogLevelColor: string[] = [
	'black',
	'red',
	'red',
	'yellow',
	'white',
	'white',
	'gray',
	'gray',
	'gray',
];

// eslint-disable-next-line prefer-named-capture-group
const getSourcePositionRegEx = /\s*at\s(([^\s]+)\s)?\(?(\s\()?([^:]+):(\d+):(\d+)/u;

interface SourcePosition {
	function: string;
	file: string;
	line: string;
	col: string;
}

export function getFullStack() {
	let error: Error;
	try {
		throw Error('');
	} catch (err) {
		error = err;
	}
	return error.stack;
}

export function getSourcePosition(skipFrames?: number): SourcePosition {
	let error: Error;
	try {
		throw Error('');
	} catch (err) {
		error = err;
	}
	// Console.log(error.stack);
	const callerLine = error.stack!.split('\n')[(skipFrames ?? 0) + 2];
	const match = getSourcePositionRegEx.exec(callerLine);
	if (!match) {
		throw new Error(`Failed to parse call stack line [${callerLine}] at getSourcePosition`);
	}
	return {
		function: match[2],
		file: match[4],
		line: match[5],
		col: match[6],
	};
}

function formatSourcePosition(sourcePosition: SourcePosition) {
	return `[${sourcePosition.function} ${sourcePosition.file}:${sourcePosition.line}:${sourcePosition.col}]`;
}

class Logger {
	private memory: typeof Memory.logger;

	private static instance: Logger;

	constructor() {
		memInit(Memory, 'logger', { printLevel: LogLevel.INFO });
		this.memory = Memory.logger;
	}

	f(...args: any[]) {
		this.log(LogLevel.FATAL, args, 1);
		throw new Error('Fatal Error !!!');
	}

	e(...args: any[]) {
		this.log(LogLevel.ERROR, args, 1);
	}

	w(...args: any[]) {
		this.log(LogLevel.WARN, args, 1);
	}

	i(...args: any[]) {
		this.log(LogLevel.INFO, args, 1);
	}

	v(...args: any[]) {
		this.log(LogLevel.VERBOSE, args, 1);
	}

	d(...args: any[]) {
		this.log(LogLevel.DEBUG, args, 1);
	}

	d2(...args: any[]) {
		this.log(LogLevel.DEBUG2, args, 1);
	}

	d3(...args: any[]) {
		this.log(LogLevel.DEBUG3, args, 1);
	}

	logEveryN(interval: number, logLevel: LogLevel, ...args: any[]) {
		if (Game.time % interval === 0) {
			this.log(logLevel, args, 1);
		}
	}

	private log(logLevel: LogLevel, logArgs: any[], skipFrames: number) {
		const { printLevel } = this.memory;
		if (logLevel > printLevel) {
			return;
		}
		const args: string[] = [];
		if (logLevel <= LogLevel.WARN || printLevel >= LogLevel.DEBUG) {
			let paddedStr = `${LogLevel[logLevel]}   `;
			paddedStr = paddedStr.substr(0, 7);
			const coloredStr = `<font color="${LogLevelColor[logLevel]}">${paddedStr}</font>`;
			args.push(coloredStr);
		}
		args.push(`${Game.time}`);
		for (let i = 0; i < logArgs.length; ++i) {
			const argValue = logArgs[i];
			let argRepr;
			if (typeof argValue === 'string') {
				argRepr = argValue;
			} else if (argValue && typeof argValue.toString2 === 'function') {
				argRepr = argValue.toString2();
			} else if (argValue && typeof argValue.toString === 'function' && argValue.toString() !== '[object Object]') {
				argRepr = argValue.toString();
			} else {
				argRepr = JSON.stringify(argValue);
			}
			args.push(argRepr);
		}
		args.push(formatSourcePosition(getSourcePosition(skipFrames + 1)));
		// eslint-disable-next-line no-console
		console.log.apply(null, args);
	}

	static getInstance() {
		if (!Logger.instance) {
			Logger.instance = new Logger();
		}
		return Logger.instance;
	}
}

export const log = Logger.getInstance();
