/**
 * Logger — centralized logging utility wrapping electron-log.
 * Logs output to console in dev mode and to disk logs in production.
 */
import log from 'electron-log'

// Configure file transport
log.transports.file.level = 'info'
log.transports.console.level = 'debug'

export default log
