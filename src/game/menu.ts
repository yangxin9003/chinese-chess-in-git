import { Menu } from 'command-line-draw'
import EventEmitter from 'events';
import terminal from './terminal'
import Notice from './notice'

export default class MainMenu extends EventEmitter {
    menu: Menu
    notice: Notice = new Notice(0, 0, 'white', true)
    constructor () {
        super()
        this.menu = new Menu((i: number) => {
            this.emit(this.menu.options[i])
        }, [
            "start",
            "load"
        ]);
        terminal().addSprite(this.menu)
    }
    start () {
        terminal().clear()
        this.notice.render('按对应序号进行选择')
        this.menu.draw(0, 4);
    }
    close () {
        terminal().clear()
    }
}
