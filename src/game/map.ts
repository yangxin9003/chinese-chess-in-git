import _ from 'lodash'
import chalk from 'chalk'
import DefaultMapState, {Player, PlayerColor, getPlayerMasterSurface, ColorString} from './state'
import { Sprite } from 'command-line-draw'
import terminal from './terminal'

const WIDTH = (9 * 3 - 1)
const HEIGHT = 10

export type Position = [number, number]

export class Tile extends Sprite {
    surface: string
    color: ColorString
    active: boolean = false
    selected: boolean = false
    #timer: NodeJS.Timer|number = 0
    constructor (surface:string = '｜', color: ColorString = 'gray') {
        super((x, y, renderSurface) => {
            let text = renderSurface || this.surface
            if (this.active) {
                text = chalk[this.color].bgWhite(text)
            } else {
                text = chalk[this.color](text)
            }
            terminal().write(text, x, y)
        })
        this.surface = surface
        this.color = color
    }
    rerender () {
        if (this.showing) {
            this.draw(this.x, this.y)
        }
    }
    setActive (isActive = false) {
        this.active = isActive
        this.rerender()
    }
    setSelected (isSelected = false) {
        this.selected = isSelected
        if (this.selected) {
            let isShow = true
            this.draw(this.x, this.y, '  ')
            this.#timer = setInterval(() => {
                if (this.showing) {
                    this.draw(this.x, this.y, isShow ? this.surface : '  ')
                    isShow = !isShow
                } else {
                    clearInterval(this.#timer)
                }
            }, 300)
        } else {
            clearInterval(this.#timer)
            this.rerender()
        }
    }
    toJSON () {
        return
    }
}

export class Chess extends Tile {
    player: Player
    isDead: Boolean = false
    constructor (surface:string, color: ColorString, player: Player) {
        super(surface, color)
        this.player = player
    }
    setDead () {
        this.isDead = true
        this.clear()
    }
    toJSON () {
        return {
            surface: this.surface,
            player: this.player
        }
    }
}

export default class GameMap {

    static top = 0
    static left = 0
    static width = WIDTH
    static height = HEIGHT
    static right = GameMap.left + GameMap.width
    static bottom = GameMap.top + GameMap.height

    data: Array<Array<Tile>> = []
    background: Sprite|null = null
    reverse: boolean = false

    constructor (reverse = false) {
        this.reverse = reverse
    }

    toJSON () {
        if (this.reverse) {
            const newData = this.data.map(row => row.map(tile => tile))
            newData.forEach(row => row.reverse())
            newData.reverse()
            return newData
        }
        return this.data
    }

    init (state: typeof DefaultMapState = DefaultMapState) {
        this.restoreMap(state)
        this.rerender()
    }
    restoreMap (mapState: typeof DefaultMapState) {
        const map = mapState.map(
            row => row.map(
                data => data ? new Chess(data.surface, data.player === Player.red ? PlayerColor.red : PlayerColor.black, data.player) :  new Tile()
            )
        )
        if (this.reverse) {
            map.forEach(row => row.reverse())
            map.reverse()
        }
        this.data = map
    }
    rerender () {
        this.renderBackground()
        this.renderTiles()
    }
    renderBackground () {
        if (!this.background) {
            const lineText = _.repeat('-', GameMap.right)
            const riverText = _.repeat('~', GameMap.right)
            this.background = new Sprite((x, y) => {
                _.forEach(this.data, (row, rowIndex) => {
                    if (rowIndex === 4 || rowIndex === 5) {
                        terminal().write(riverText, 0, rowIndex)
                    } else {
                        terminal().write(lineText, 0, rowIndex)
                    }
                })
                _.forEach(Array(GameMap.height).fill('║'), (text, rowIndex) => {
                    terminal().write(text, GameMap.right, rowIndex)
                })
            })
        }
        terminal().addSprite(this.background)
        this.background.draw(GameMap.top, GameMap.left)
    }
    renderTiles () {
        _.forEach(this.data, (row, rowIndex) => {
            _.forEach(row, (tile, colIndex) => {
                terminal().addSprite(tile)
                tile.draw(GameMap.left + (colIndex * 3), GameMap.top + rowIndex)
            })
        })
    }
    findMasterPosition (player: Player): Position|void {
        const masterSurface = getPlayerMasterSurface(player)
        let rowIndex = this.data.length - 1
        while (rowIndex >= 0) {
            const row = this.data[rowIndex]
            let colIndex = row.length - 1
            while (colIndex >= 0) {
                const tile = this.data[rowIndex][colIndex]
                if (tile.surface === masterSurface) {
                    return [rowIndex, colIndex]
                }
                colIndex -= 1
            }
            rowIndex -= 1
        }
    }
    findChessPosition (chess: Chess): Position|void {
        let rowIndex = this.data.length - 1
        while (rowIndex >= 0) {
            const row = this.data[rowIndex]
            let colIndex = row.length - 1
            while (colIndex >= 0) {
                const tile = this.data[rowIndex][colIndex]
                if (tile === chess) {
                    return [rowIndex, colIndex]
                }
                colIndex -= 1
            }
            rowIndex -= 1
        }
    }
    getTile (position: Position) {
        const [r, c] = position
        return this.data[r][c]
    }
    setTile (position: Position, tile: Tile) {
        const [r, c] = position
        this.data[r][c] = tile
        terminal().addSprite(tile)
        tile.draw(GameMap.left + (c * 3), GameMap.top + r)
    }
    gotoPosition (chess: Chess, targetPosition: Position) {
        const srcPosition = this.findChessPosition(chess)
        if (!srcPosition) {
            return
        }
        const targetTile = this.getTile(targetPosition)
        if (targetTile instanceof Chess) {
            targetTile.setDead()
            this.setTile(srcPosition, new Tile())
        } else {
            this.setTile(srcPosition, targetTile)
        }
        this.setTile(targetPosition, chess)
        // 不重新绘制会导致被吃掉的子残留显示
        this.renderTiles()
    }
    isPositionInside (position: Position) {
        const [r, c] = position
        return r >= 0 && r < this.data.length && c >=0 && c < this.data[0].length
    }
    convertPosition (positon: Position): Position {
        if (this.reverse) {
            const [r, c] = positon
            return [this.data.length - r - 1, this.data[r].length - c - 1]
        }
        return positon
    }
}
