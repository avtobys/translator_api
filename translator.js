class Translator {

    constructor(buttonText, buttonSuccesText, lang = "en-ru", apiUrl, dbclick, spinner = "") { // собираем класс
        this.buttonText = buttonText,
            this.buttonSuccesText = buttonSuccesText,
            this.lang = "en-ru",
            this.spinner = spinner,
            this.dbclick = dbclick,
            this.apiUrl = apiUrl,
            this.tID = null;
    }

    init() { // инициализируем слушатели, блоки и включаем кнопки
        window.addEventListener("click", this.clickListener);
        window.addEventListener("dblclick", this.dblclickListener);
        document.querySelectorAll("[data-trans]").forEach(el => {
            el.innerHTML = this.buttonText; // прописываем текст на кнопках
            el.style.display = "inline-block"; // делаем кнопки видимыми
            let transBlock = this.getTransBlock(el, el.dataset.trans); // минимальная высота переводимых блоков, чтобы меньше прыгали
            transBlock.style.minHeight = transBlock.offsetHeight + "px";
        });
    }

    getTransBlock(el, selector) { // получаем элемент переводимого блока, рекурсивно проверяя родителей
        return el.parentNode.querySelector(selector) || this.getTransBlock(el.parentNode, selector);
    }

    clickListener(e) { // обработчик одиночного клика
        let target;
        if (!(target = translator.getTarget(e.target))) {
            return;
        }
        if (~~target.dataset.lock) {
            return;
        }
        target.dataset.lock = 1;
        clearTimeout(translator.tID);
        translator.tID = setTimeout(() => {
            translator.targetSearch(target);
        }, 250);
        
    }

    dblclickListener(e) { // при получении двойного клика, стреляем по всем остальным или восстанавливаем все исходники
        let target;
        if (!(target = translator.getTarget(e.target))) {
            return;
        }
        clearTimeout(translator.tID);
        if (translator.backupCheck(target)) { // если это переведенный блок, то восстанавливаем все из бекапов
            document.querySelectorAll("[data-trans]").forEach((el, i) => { // обходим все кнопки и восстанавливаем
                translator.backupRestore(el);
            });
        } else {
            document.querySelectorAll("[data-trans]").forEach((el, i) => { // обходим все кнопки и запускаем их
                translator.targetShoot(el, i);
            });
        }

    }

    getTarget(el) { // ищем в родителе если двойной клик
        let target;
        if (el.dataset && el.dataset.trans) {
            target = el;
        } else if (el.parentNode.dataset && el.parentNode.dataset.trans) {
            target = el.parentNode;
        }
        return target;
    }

    targetSearch(target) {
        document.querySelectorAll("[data-trans]").forEach((el, i) => { // обходим все кнопки и находим цель
            if (target == el) {
                translator.targetShoot(el, i);
                return;
            }
        });
    }

    targetShoot(el, index) { // выстрел в цель
        el.dataset.lock = 1;
        el.dataset.index = index;
        el.innerHTML = translator.spinner;
        if (translator.backupCheck(el)) {
            translator.backupRestore(el);
            return;
        } else {
            translator.backupSave(el);
        }
        translator.sendData(el);
    }

    sendData(el) { // отправка данных
        let uid = el.dataset.index, // формируем неизменный(для работы кеша) uid функции из индекса элемента
            callbackName = "callback" + uid;
        this[uid] = el;
        translator[callbackName] = function (data) { // обрабатываем успешный запрос
            let el = translator[uid];
            translator.getTransBlock(el, el.dataset.trans).innerHTML = data.text;
            el.innerHTML = translator.buttonSuccesText;
            translator.cleaner(uid);
        }
        let s = document.createElement('script');
        s.src = this.apiUrl + "?callback=translator." + callbackName + "&lg=" + this.lang + "&text=" + encodeURIComponent(this.getTransBlock(el, el.dataset.trans).innerHTML);
        let t = document.getElementsByTagName("script")[0];
        t.parentNode.insertBefore(s, t);
        s.onerror = function () { // обрабатываем ошибку
            el.innerHTML = translator.buttonText;
            translator.cleaner(uid);
        }
    }

    cleaner(uid) { // очистка памяти после удачного или неудачного запроса
        let el = translator[uid];
        el.dataset.lock = 0;
        delete translator["callback" + uid];
        delete translator[uid];
        let s = document.querySelector("script[src*=callback" + uid + "]");
        s.parentNode.removeChild(s);
    }

    backupSave(el) { // сохраняем исходное состояние
        el.dataset.backup = JSON.stringify(this.getTransBlock(el, el.dataset.trans).innerHTML);
    }

    backupRestore(el) { // откатываем на исходное состояние
        translator.getTransBlock(el, el.dataset.trans).innerHTML = JSON.parse(el.dataset.backup);
        delete el.dataset.backup;
        el.innerHTML = translator.buttonText;
        el.dataset.lock = 0;
    }

    backupCheck(el) { // проверяем есть ли бекап
        return el.dataset.backup || 0;
    }

}

let translator = new Translator("Перевести", "Переведено", "en-ru", "http://example.com/api_path", false, '<svg xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0" width="80px" height="10px" viewBox="0 0 158 24" xml:space="preserve"><path fill="#e3e3e3" d="M64 4h10v10H64V4zm20 0h10v10H84V4zm20 0h10v10h-10V4zm20 0h10v10h-10V4zm20 0h10v10h-10V4zM4 4h10v10H4V4zm20 0h10v10H24V4zm20 0h10v10H44V4z"/><path fill="#bcbebc" d="M144 14V4h10v10h-10zm9-9h-8v8h8V5zm-29 9V4h10v10h-10zm9-9h-8v8h8V5zm-29 9V4h10v10h-10zm9-9h-8v8h8V5zm-29 9V4h10v10H84zm9-9h-8v8h8V5zm-29 9V4h10v10H64zm9-9h-8v8h8V5zm-29 9V4h10v10H44zm9-9h-8v8h8V5zm-29 9V4h10v10H24zm9-9h-8v8h8V5zM4 14V4h10v10H4zm9-9H5v8h8V5z"/><g><path fill="#d9d9d9" d="M-58 16V2h14v14h-14zm13-13h-12v12h12V3z"/><path fill="#9c9c9c" fill-opacity="0.3" d="M-40 0h18v18h-18z"/><path fill="#b2b2b2" d="M-40 18V0h18v18h-18zm17-17h-16v16h16V1z"/><path fill="#9c9c9c" fill-opacity="0.7" d="M-20 0h18v18h-18z"/><path fill="#4c4c4c" d="M-20 18V0h18v18h-18zM-3 1h-16v16h16V1z"/><animateTransform attributeName="transform" type="translate" values="20 0;40 0;60 0;80 0;100 0;120 0;140 0;160 0;180 0;200 0" calcMode="discrete" dur="2400ms" repeatCount="indefinite"/></g></svg>');
translator.init();
