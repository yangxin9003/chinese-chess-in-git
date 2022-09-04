import _ from 'lodash'
import chalk from 'chalk'
import EventEmitter from 'events'
import DefaultMapState, {Player, AllBlack, AllRed} from './state'
import GameMap, {Tile, Chess, Position} from './map'
import terminal from './terminal'
import Notice from './notice'

export default class Game extends EventEmitter{
    map: GameMap
    activeTile: Tile|null = null
    activePosition: Position|null = null
    selectedTile: Tile|null = null
    player: Player
    // 当前玩家回合标识
    active: boolean = false
    // 提示
    stepNotice: Notice = new Notice(GameMap.right + 2, 0)
    deathNoticeRed: Notice = new Notice(GameMap.right + 2, 1, 'red', true)
    deathNoticeBlack: Notice = new Notice(GameMap.right + 2, 2, 'blue', true)
    notice: Notice = new Notice(GameMap.right + 2, GameMap.bottom - 1, 'yellow')
    // 游戏结束标识
    isGameOver = false
    inputHandler: (...args: any[]) => void
    constructor (player: Player, state: typeof DefaultMapState = DefaultMapState) {
        super()
        terminal().clear()
        this.player = player
        this.map = new GameMap(player === Player.black)
        this.map.init(state)
        this.renderDeathInfo()
        this.inputHandler = (_chunk: any, key: any) => this.onKeypress(key)
        terminal().in.on('keypress', this.inputHandler)
    }
    destroy () {
        terminal().clear()
        terminal().in.off('keypress', this.inputHandler)
    }
    startTurn () {
        this.clearAllActions()
        const position = this.map.findMasterPosition(this.player)
        if (position) {
            this.notice.render('方向键移动|空格键确定|Q键重置选择')
            this.active = true
            this.setActiveTile(position)
        }
    }
    stopTurn () {
        this.active = false
        this.clearAllActions()
    }
    onKeypress (key: any) {
        if (this.isGameOver) {
            if (key.name === 'space' || key.name === 'enter' || key.name === 'q' || key.name === 'escape') {
                this.emit('exit')
            }
            return
        }
        if (this.active) {
            if (key.name === 'space') {
                if (!this.selectedTile) {
                    this.setSelectedTile()
                } else {
                    const srcPosition = this.map.findChessPosition(this.selectedTile as Chess)
                    if (srcPosition && this.activePosition) {
                        const isValid = this.applyAction(srcPosition, this.activePosition)
                        if (isValid) {
                            this.stopTurn()
                            this.emit('push', [this.map.convertPosition(srcPosition), this.map.convertPosition(this.activePosition)])
                        }
                    }
                }
            } else if (key.name === 'q' || key.name === 'escape') {
                this.startTurn()
            } else if (key.name === 'right' || key.name === 'left' || key.name === 'up' || key.name === 'down') {
                const rStep = key.name === 'up' ? -1 : (key.name === 'down' ? 1 : 0)
                const cStep = key.name === 'right' ? 1 : (key.name === 'left' ? -1 : 0)
                if (this.activePosition) {
                    const newPosition = [this.activePosition[0] + rStep, this.activePosition[1] + cStep] as Position
                    if (this.map.isPositionInside(newPosition)) {
                        this.activePosition = newPosition
                        this.setActiveTile(this.activePosition)
                    }
                }
            }
        } else {
            this.notice.render('不许动！')
        }
    }
    setActiveTile (position: Position) {
        this.activePosition = position
        if (this.activeTile) {
            this.activeTile.setActive(false)
        }
        this.activeTile = this.map.getTile(position)
        if (this.activeTile) {
            this.activeTile.setActive(true)
        }
    }
    clearActiveTile () {
        if (this.activeTile) {
            this.activeTile.setActive(false)
            this.activeTile = null
        }
    }
    setSelectedTile () {
        if (this.activeTile && (this.activeTile instanceof Chess) && this.activeTile.player === this.player) {
            if (this.selectedTile) {
                this.selectedTile.setSelected(false)
            }
            this.selectedTile = this.activeTile
            if (this.selectedTile) {
                this.selectedTile.setSelected(true)
            }
            this.notice.reset()
        } else {
            this.notice.render('请选择自己的棋子')
        }
    }
    clearSelectedTile () {
        if (this.selectedTile) {
            this.selectedTile.setSelected(false)
            this.selectedTile = null
        }
    }
    clearAllActions () {
        this.clearActiveTile()
        this.clearSelectedTile()
    }
    applyActionFromOtherPlayer (commonSrcPosition: Position, commontTargetPosition: Position) {
        this.applyAction(this.map.convertPosition(commonSrcPosition), this.map.convertPosition(commontTargetPosition))
    }
    applyAction (srcPosition: Position, targetPosition: Position) {
        if (this.isGameOver) {
            return false
        }
        const srcTile = this.map.getTile(srcPosition) as Chess
        const targetTile = this.map.getTile(targetPosition)
        if (this.checkAction(srcPosition, targetPosition)) {
            this.notice.reset()
            this.stepNotice.render(this.getActionDesc(srcPosition, targetPosition), srcTile.color)
            this.map.gotoPosition(srcTile, targetPosition)
            this.renderDeathInfo()
            // 如果吃子，检查该子对应玩家的master是否还在
            if (targetTile instanceof Chess) {
                const masterPosition = this.map.findMasterPosition(targetTile.player)
                if (!masterPosition) {
                    this.isGameOver = true
                    this.renderGameOver(targetTile.player === this.player ? 'LOSE' : 'WIN')
                }
            }
            return true
        } else {
            this.notice.render('您懂不懂规矩')
        }
        return false
    }
    getMapData (): typeof DefaultMapState {
        return JSON.parse(JSON.stringify(this.map))
    }
    renderGameOver (text: string) {
        terminal().writeLarge(text, GameMap.right + 2, 3)
    }
    renderDeathInfo () {
        const currentRed = _.groupBy(_.flatten(this.map.data).filter(data => data instanceof Chess && data?.player === Player.red), 'surface')
        const currentBlack = _.groupBy(_.flatten(this.map.data).filter(data => data instanceof Chess && data?.player === Player.black), 'surface')
        const getText = (all: typeof AllRed, current: typeof currentRed) => {
            const textList: Array<String> = []
            _.forEach(all, (list, surface) => {
                const count = list.length - current[surface]?.length
                if (count > 0) {
                    textList.push(`${surface}x${count}`)
                }
            })
            return textList.sort().join(',')
        }
        this.deathNoticeRed.render(`红方丢子:${getText(AllRed, currentRed)}`)
        this.deathNoticeBlack.render(`黑方丢子:${getText(AllBlack, currentBlack)}`)
    }
    checkAction (srcPosition: Position, targetPosition: Position) {
        const srcTile = this.map.getTile(srcPosition)
        const targetTile = this.map.getTile(targetPosition)
        // 如果目标是自己的棋子，不能走
        if (targetTile instanceof Chess && srcTile instanceof Chess && targetTile.player === srcTile.player) {
            return false
        }
        const [sr, sc] = srcPosition
        const [tr, tc] = targetPosition
        const masterHomeLeft = 3
        const masterHomeRight = 5
        const masterHomeTop = 2
        const masterHomeBottom = 7
        const riverTop = 4
        const riverBottom = 5
        const checkChessOnPath = (num: number) => {
            const rowList = _.range(sr, tr).slice(1)
            const colList = _.range(sc, tc).slice(1)
            const numC = _.filter(colList, colIndex => (this.map.getTile([sr, colIndex]) instanceof Chess)).length
            const numR = _.filter(rowList, rowIndex => (this.map.getTile([rowIndex, sc]) instanceof Chess)).length
            return (numC + numR) === num
        }
        switch (srcTile?.surface) {
            case '将':
            case '帅': {
                return ( (Math.abs(tr - sr) + Math.abs(tc - sc)) === 1 ) // 一步限制
                    && ( tc >= masterHomeLeft && tc <= masterHomeRight) && ( tr <= masterHomeTop || tr >= masterHomeBottom) // 限制在营地内
            }
            case '士':
            case '仕': {
                return ( Math.abs(tr - sr) === 1 && Math.abs(tc - sc) === 1 ) // 斜对角一步限制
                    && ( tc >= masterHomeLeft && tc <= masterHomeRight) && ( tr <= masterHomeTop || tr >= masterHomeBottom) // 限制在营地内
            }
            case '象':
            case '相': {
                const leg: Position = [sr + ((tr - sr) / 2), sc + ((tc - sc) / 2)]
                return ( Math.abs(tr - sr) === 2 && Math.abs(tc - sc) === 2 ) // 田字走法限制
                    && ((sr <= riverTop && tr <= riverTop) || (sr >= riverBottom && tr >= riverBottom)) // 不过河
                    && !(this.map.getTile(leg) instanceof Chess) // 没别象眼
            }
            case '马': {
                const leg: Position = [sr + Math.trunc((tr - sr) / 2), sc + Math.trunc((tc - sc) / 2)]
                return ( (Math.abs(tr - sr) === 2 && Math.abs(tc - sc) === 1) || (Math.abs(tr - sr) === 1 && Math.abs(tc - sc) === 2) ) // 日字走法限制
                    && !(this.map.getTile(leg) instanceof Chess) // 无别马腿
            }
            case '车': {
                return ( tr === sr || tc === sc ) // 直线走法
                    && checkChessOnPath(0) // 路径中无子
            }
            case '炮': {
                return ( tr === sr || tc === sc ) // 直线走法
                    && checkChessOnPath((targetTile instanceof Chess) ? 1 : 0) // 吃到子的情况下 路径中有1子 否则路径上无子
            }
            case '兵':
            case '卒': {
                const masterPosition = this.map.findMasterPosition((srcTile as Chess).player)
                if (masterPosition) {
                    const masterRowIndex = masterPosition[0]
                    const isCrossRiver = Math.abs(sr - masterRowIndex) >= Math.max(Math.abs(riverTop - masterRowIndex), Math.abs(riverBottom - masterRowIndex))
                    return ( (Math.abs(tr - sr) + Math.abs(tc - sc)) === 1 ) // 一步限制
                        && ( Math.abs(sr - masterRowIndex) <= Math.abs(tr - masterRowIndex)) // 只能向前
                        && Math.abs(tc - sc) <= (isCrossRiver ? 1 : 0)// 过河才能横着走
                }
            }
        }
        return false
    }

    getActionDesc (srcPosition: Position, targetPosition: Position) {
        let [sR, sC] = srcPosition
        let [tR, tC] = targetPosition
        const tile = this.map.getTile(srcPosition)
        if (tile instanceof Chess && tile.player === this.player) {
            sR = this.map.data.length - sR
            tR = this.map.data.length - tR
        }
        let actionTypeName = '平'
        if (tR > sR) {
            actionTypeName = '进'
        } else if (tR < sR) {
            actionTypeName = '退'
        }
        let step = tC === sC ? (tR - sR) : (tC + 1)
        return `${tile.surface}${sC + 1}${actionTypeName}${step}`
    }
    getMapStateCommitMessage (mapState: typeof DefaultMapState) {
        return mapState.map(row =>
            row.map(tile =>
                tile
                    ? chalk[tile.player === Player.red ? 'red' : 'blue'](tile.surface)
                    : '｜'
            ).join('-')
        ).join('\n')
    }
}
