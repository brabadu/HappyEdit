var EditSession = require('ace/edit_session').EditSession;
var UndoManager = require('ace/undomanager').UndoManager;
var sessions = {};
var editor;
var editorElement;
var trie = {};
var currentlySelectedFilename;

var Mode = function(name, desc, clazz, extensions) {
    this.name = name;
    this.desc = desc;
    this.clazz = clazz;
    this.mode = new clazz();
    this.mode.name = name;
    
    this.extRe = new RegExp("^.*\\.(" + extensions.join("|") + ")$", "g");
};

Mode.prototype.supportsFile = function(filename) {
    return filename.match(this.extRe);
};

var modes = [
    new Mode("text", "Text", require("ace/mode/text").Mode, ["txt"]),
    new Mode("html", "HTML", require("ace/mode/html").Mode, ["html", "htm"]),
    new Mode("css", "CSS", require("ace/mode/css").Mode, ["css"]),
    new Mode("javascript", "JavaScript", require("ace/mode/javascript").Mode, ["js"]),
    new Mode("json", "JSON", require("ace/mode/json").Mode, ["json"]),
    new Mode("python", "Python", require("ace/mode/python").Mode, ["py"]),
    new Mode("php", "PHP",require("ace/mode/php").Mode, ["php"]),
    new Mode("text", "Text", require("ace/mode/text").Mode, ["txt"])
];

var diffMode = new Mode("diff", "Diff", require("ace/mode/diff").Mode, ["diff"]);

function getLinesInCurrentBuffer() {
    return editor.getSession().getValue();
}

function getCurrentlySelectedFileName() {
    if (!currentlySelectedFilename) {
        throw "currentlySelectedFilename is not set";
    }
    return currentlySelectedFilename;
}

function save(fileName, lines) {
    var xhr = new XMLHttpRequest();
    var url = '/files/' + encodeURIComponent(fileName);
    var params = 'body=' + encodeURIComponent(lines);
    xhr.open("POST", url);
    document.querySelector('#notification').style.visibility = 'visible';

    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            document.querySelector('#notification').style.visibility = 'hidden';
            console.log(xhr.responseText);
            editor.getSession().getUndoManager().reset();
        }
    };

    xhr.send(params);
}

function updateSize() {
    var w = window.innerWidth;
    var h = window.innerHeight - document.querySelector('#top').offsetHeight;

    editorElement.style.width = w + 'px';
    editorElement.style.height = h + 'px';
}

window.onload = function() {
    editor = ace.edit("editor");
    session = editor.getSession();
    editorElement = document.getElementById('editor');

    CommandLine.init();
    Settings.init();

    window.onresize = function(event) {
        updateSize();
    }

    updateSize();
    loadFiles();

    editor.setKeyboardHandler(require("ace/keyboard/vim").handler);
    editor.setAnimatedScroll(true);

    editor.commands.addCommand({
        name: "save",
        bindKey: {
            win: "Ctrl-S",
            mac: "Command-S",
            sender: "editor"
        },
        exec: function() {
            save(getCurrentlySelectedFileName(), getLinesInCurrentBuffer());
        }
    });

    editor.commands.addCommand({
        name: "open file",
        bindKey: {
            win: "Ctrl-O",
            mac: "Command-O",
            sender: "editor"
        },
        exec: function() {
            CommandLine.show('');
        }
    });

    editor.getKeyboardHandler().actions[':'] = {
        fn: function(editor, range, count, param) {
            CommandLine.show(":");
        }
    };

    editor.getKeyboardHandler().actions['/'] = {
        fn: function(editor, range, count, param) {
            CommandLine.show("/");
        }
    };

    editor.getKeyboardHandler().actions['?'] = {
        fn: function(editor, range, count, param) {
            CommandLine.show("?");
        }
    };
};

function getModeForFile(filename) {
    var mode = modes[0];
    for (var i = 0; i < modes.length; i++) {
        if (modes[i].supportsFile(filename)) {
            mode = modes[i];
            break;
        }
    }
    return mode.mode;
}

function createSessionForFile(filename, body) {
    var session = new EditSession(body);
    session.setMode(getModeForFile(filename));
    session.setUndoManager(new UndoManager());
    return session;
}

function onFileClicked(event) {
    fileClicked(this);
}

function fileClicked(elem) {
    var filename = elem.getAttribute('rel');
    var lineNumberSpan = elem.querySelector('.lineno');
    var lineNumber = null;
    if (lineNumberSpan) {
        var lineNumber = lineNumberSpan.innerHTML;
    }
    openFile(filename, lineNumber)
}

function openFile(filename, lineNumber) {
    var xhr = new XMLHttpRequest();
    var url = '/files/' + filename;
    window.currentlySelectedFilename = filename;
    setTopTitle(filename);
    xhr.open("GET", url);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            var session;
            if (sessions.hasOwnProperty(filename)) {
                session = sessions[filename];
            } else {
                session = createSessionForFile(filename, xhr.responseText);
                sessions[filename] = session;
            }

            /*
            session.getDocument().on('change', function(event) {
                addClass(elem, 'modified');
                if (session.getUndoManager().$undoStack.length === 0) {
                    removeClass(elem, 'modified');
                }
            });
            */

            if (lineNumber) {
                editor.gotoLine(lineNumber);
                editor.scrollToLine(lineNumber);
            }
            editor.setSession(session);
        }

        localStorage.filename = filename;
    };
    xhr.send();
}

function makeAutoSuggestable(filename) {
    var parts;

    function add(filename, fullFileName, isLastPart) {
        var i = 0;
        var key = '';
        var hash = trie;

        for (i = 0; i < filename.length; i += 1) {
            key += filename[i];
            if (!hash.hasOwnProperty(key)) {
                hash[key] = {};
            }
            hash = hash[key];

            if (i === filename.length - 1 && isLastPart) {
                hash['fullFileName'] = fullFileName;
            }
        }

    }

    add(filename, filename, true);
    parts = filename.split('/');
    parts.forEach(function(part, i) {
        add(part, filename, i === (parts.length - 1));
    });
}

function getKeys(hash) {
    var ret = [];
    var key = '';

    for (key in hash) {
        if (hash.hasOwnProperty(key)) {
            if (typeof(hash[key]) === 'string') {
                ret.push(hash[key]);
            } else {
                ret = ret.concat(getKeys(hash[key]));
            }
        }
    }

    return ret;
}

function getAutoSuggestions(inputText) {
    var i;
    var key = '';
    var hash = trie;

    for (i = 0; i < inputText.length; i += 1) {
        key += inputText[i];
        hash = hash[key];
        if (i === inputText.length - 1) {
            return getKeys(hash);
        }
    }
}

function createFileListView(file, lineno, clickCallback) {
    var li = document.createElement('li');
    var titleSpan = document.createElement('span');

    titleSpan.setAttribute('class', 'title');
    titleSpan.innerHTML = capFileName(file, 50);
    li.setAttribute('rel', file);
    li.appendChild(titleSpan);

    if (lineno) {
        var lineNumberSpan = document.createElement('span');
        lineNumberSpan.setAttribute('class', 'lineno');
        lineNumberSpan.innerHTML = lineno;
        li.appendChild(lineNumberSpan);
    }

    li.setAttribute('title', file);
    li.onclick = clickCallback || onFileClicked;

    return li;
}

function loadFiles() {
    var xhr = new XMLHttpRequest();
    var url = '/files';

    // Configure ignored extensions with:
    // localStorage.ignored_extensions = JSON.stringify(['.pyc', '.png']);

    var ignoredExtensions = JSON.parse(localStorage.ignored_extensions || '[]');
    if (ignoredExtensions) {
        url = '/files?ignored_extensions=' + ignoredExtensions.join(',');
    }

    xhr.open("GET", url);

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            var json = JSON.parse(xhr.responseText);
            json.forEach(function(filename, i) {
                if (filename === localStorage.filename) {
                    openFile(filename);
                }
                makeAutoSuggestable(filename);
            });
        }
    };

    xhr.send();
}

function setTopTitle(title) {
    document.querySelector('#top h1').innerHTML = title;
}