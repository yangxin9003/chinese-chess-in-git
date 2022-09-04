import { Terminal } from 'command-line-draw'

let terminal: Terminal

export default function getTerminalInstance (): Terminal {
    if (!terminal) {
        terminal = new Terminal({
            height: 10,
            border: 'double'
        })
    }
    return terminal
}
