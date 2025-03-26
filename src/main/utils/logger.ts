import * as winston from 'winston';
import * as path from 'path';
import { app } from 'electron';

const logDir = path.join(app.getPath('userData'), 'logs');

const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf((info: winston.Logform.TransformableInfo) => {
        const { timestamp, level, message, service } = info;
        return `${timestamp} [${service}] ${level}: ${message}`;
    })
);

export function createLogger(service: string) {
    return winston.createLogger({
        level: 'info',
        format: logFormat,
        defaultMeta: { service },
        transports: [
            new winston.transports.File({
                filename: path.join(logDir, 'error.log'),
                level: 'error'
            }),
            new winston.transports.File({
                filename: path.join(logDir, 'combined.log')
            }),
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    logFormat
                )
            })
        ]
    });
}

// Create a default logger for general use
export const logger = createLogger('main'); 