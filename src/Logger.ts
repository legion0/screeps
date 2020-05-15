import {memInit} from './Memory';

declare global {
	interface Memory {
		logger: {
			print_level: LogLevel;
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

const getSourcePositionRegEx = /\s*at\s(([^\s]+)\s)?\(?(\s\()?([^:]+):(\d+):(\d+)/;

interface SourcePosition {
	function: string;
	file: string;
	line: string;
	col: string;
}

/**
 * @example
 */
export function getFullStack () {
	let error: Error;
	try {
		throw Error('');
	} catch (err) {
		error = err;
	}
	return error.stack;
}

/**
 * @param skipFrames
 * @example
 */
export function getSourcePosition (skipFrames?: number): SourcePosition {
	let error: Error;
	try {
		throw Error('');
	} catch (err) {
		error = err;
	}
	// Console.log(error.stack);
	const callerLine = error.stack!.split('\n')[skipFrames ?? 0 + 2];
	const match = getSourcePositionRegEx.exec(callerLine);
	if (!match) {
		throw new Error(`Failed to parse call stack line [${callerLine}] at getSourcePosition`);
	}
	return {
		'function': match[2],
		'file': match[4],
		'line': match[5],
		'col': match[6],
	};
}

function formatSourcePosition (sourcePosition: SourcePosition) {
	return `[${sourcePosition.function} ${sourcePosition.file}:${sourcePosition.line}:${sourcePosition.col}]`;
}

class Logger {
	private memory: typeof Memory.logger;

	static _instance: Logger;

	constructor () {
		memInit(Memory, 'logger', {'print_level': LogLevel.INFO});
		this.memory = Memory.logger;
	}

	f (...args: any[]) {
		this._log(LogLevel.FATAL, args, 1);
		throw new Error('Fatal Error !!!');
	}

	e (...args: any[]) {
		this._log(LogLevel.ERROR, args, 1);
	}

	w (...args: any[]) {
		this._log(LogLevel.WARN, args, 1);
	}

	i (...args: any[]) {
		this._log(LogLevel.INFO, args, 1);
	}

	v (...args: any[]) {
		this._log(LogLevel.VERBOSE, args, 1);
	}

	d (...args: any[]) {
		this._log(LogLevel.DEBUG, args, 1);
	}

	d2 (...args: any[]) {
		this._log(LogLevel.DEBUG2, args, 1);
	}

	d3 (...args: any[]) {
		this._log(LogLevel.DEBUG3, args, 1);
	}

	logEveryN (interval: number, log_level: LogLevel, ...args: any[]) {
		if (Game.time % interval == 0) {
			this._log(log_level, args, 1);
		}
	}

	_log (log_level: LogLevel, log_args: any[], skipFrames: number) {
		const {print_level} = this.memory;
		if (log_level > print_level) {
			return;
		}
		const args: string[] = [];
		if (log_level <= LogLevel.WARN || print_level >= LogLevel.DEBUG) {
			let padded_str = `${LogLevel[log_level]}   `;
			padded_str = padded_str.substr(0, 7);
			const colored_str = `<font color="${LogLevelColor[log_level]}">${padded_str}</font>`;
			args.push(colored_str);
		}
		args.push(`${Game.time}`);
		for (let i = 0; i < log_args.length; ++i) {
			const arg_value = log_args[i];
			let arg_repr;
			if (typeof arg_value === 'string') {
				arg_repr = arg_value;
			} else if (arg_value && typeof arg_value.toString2 === 'function') {
				arg_repr = arg_value.toString2();
			} else if (arg_value && typeof arg_value.toString === 'function' && arg_value.toString() != '[object Object]') {
				arg_repr = arg_value.toString();
			} else {
				arg_repr = JSON.stringify(arg_value);
			}
			args.push(arg_repr);
		}
		args.push(formatSourcePosition(getSourcePosition(skipFrames + 1)));
		console.log.apply(null, args);
	}

	static getInstance () {
		if (!Logger._instance) {
			Logger._instance = new Logger();
		}
		return Logger._instance;
	}
}

export const log = Logger.getInstance();
