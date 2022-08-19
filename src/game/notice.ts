
import _ from 'lodash'
import {ColorString} from './state'
import terminal from './terminal'
import { Sprite } from 'command-line-draw'
import chalk from 'chalk'

export default class Notice extends Sprite {
    private px: number = 0
    private py: number = 0
    private repeatTime: number = 0
    private lastText: string = ''
    private lastContent: string = ''
    private currentContent: string = ''
    private color: ColorString = 'white'
    constructor (px: number, py: number, color: ColorString = 'white', noRepeat = false) {
        super((x, y) => {
            const text = _.padEnd(`${this.currentContent || ' '}${!noRepeat && this.repeatTime > 0 ? ` x ${this.repeatTime}` : ''}`, this.lastText.length, '#').replace(/#/g, '  ')
            terminal.write(chalk[this.color](text), x, y)
            this.lastText = text.replace(/\s*$/g, '')
            this.lastContent = this.currentContent
        })
        this.px = px
        this.py = py
        this.color = color
        terminal.addSprite(this)
    }
    render (content: string = '', color: ColorString = this.color) {
        this.currentContent = content
        this.color = color
        if (this.currentContent && this.lastContent === this.currentContent) {
            this.repeatTime += 1
        } else {
            this.repeatTime = 0
        }
        this.draw(this.px, this.py)
    }
    reset () {
        this.render('')
    }
}
