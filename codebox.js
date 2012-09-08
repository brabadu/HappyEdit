var EditSession = require('ace/edit_session').EditSession;
var UndoManager = require('ace/undomanager').UndoManager;
var sessions = {};
var editor;
var editorElement;
var trie = {};
var settingsPopup;
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

var CommandLine = {
    $input: null,
    $popup: null,
    $blocker: null,
    visible: false,

    commands: {
        "w": {
            hideCommandLine: true,
            fn: function(args) {
                save(getCurrentlySelectedFileName(), getLinesInCurrentBuffer());
            }
        },
        "grep": {
            hideCommandLine: false,
            fn: function(args) {
                var q = args.join(' ');
                CommandLine.grep(q);
            }
        }
    },

    init: function() {
        var self = this;
        self.$popup = document.querySelector('.popup.command-line');
        self.$input = document.querySelector('.popup.command-line input');
        self.$suggestions= document.querySelector('.popup.command-line ul');
        self.$blocker = document.querySelector('#blocker');

        self.$input.onkeyup = function(event) {
            if (event.keyCode === 27) {
                self.hide();
            }

            if (this.value[0] !== ':' && this.value[0] !== '/' && this.value[0] !== '?') {
                self.getAutoCompleteSuggestions(this.value);
            }

            if (event.keyCode === 13) {
                console.log(this.value);
                if (this.value[0] === ":") {
                    var cmd = this.value.split(":")[1];
                    var split = cmd.split(' ');
                    var cmd = split.splice(0, 1);
                    var args = split;
                    self.runCommand(cmd, args);
                } else if (this.value[0] === "/") {
                    var needle = this.value.split('/')[1];
                    editor.find(needle);
                    self.hide();
                } else if (this.value[0] === "?") {
                    var needle = this.value.split('?')[1];
                    editor.findPrevious(needle);
                    self.hide();
                }
            }
        }
    },

    getAutoCompleteSuggestions: function(s) {
        var self = this;
        var i = 0;
        var suggestions = getAutoSuggestions(s);

        var onFileClick = function() {
            self.hide();
            fileClicked(this);
        };

        self.$suggestions.innerHTML = '';

        if (s.length && suggestions.length) {
            var fragment = document.createDocumentFragment();
            suggestions.forEach(function(file, i) {
                var li = createFileListView(file, null, onFileClick);
                fragment.appendChild(li);
            });
            self.$suggestions.appendChild(fragment);
            self.$suggestions.style.display = 'block';
        } else {
            self.$suggestions.style.display = 'none';
        }
    },

    grep: function(q) {
        var self = this;
        var xhr = new XMLHttpRequest();

        var onFileClick = function() {
            self.hide();
            fileClicked(this);
        };

        self.$suggestions.innerHTML = '';
        self.$input.setAttribute('disabled');

        if (!q) {
            return;
        }

        xhr.open("GET", '/grep?q=' + encodeURIComponent(q));

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                try {
                    var json = JSON.parse(xhr.responseText);
                } catch (e) {
                    console.log('Could not parse grep response');
                    return;
                }

                if (json.length) {
                    var fragment = document.createDocumentFragment();
                    json.forEach(function(file, i) {
                        var li = createFileListView(file.filename, file.lineno, onFileClick);
                        fragment.appendChild(li);
                    });
                    self.$suggestions.appendChild(fragment);
                    self.$suggestions.style.display = 'block';
                } else {
                    self.$suggestions.style.display = 'none';
                }
                self.$input.removeAttribute('disabled');
            }
        };

        xhr.send();
    },

    runCommand: function(cmd, args) {
        var self = this;
        if (this.commands.hasOwnProperty(cmd)) {
            var command = this.commands[cmd];
            command.fn(args);
            if (command.hideCommandLine) {
                self.hide();
            }
        } else {
            throw "Unknown command '" + cmd + "'";
        }
    },

    isVisible: function() {
        return this.$popup.style.display === 'block';
    },

    show: function(startingChar) {
        var self = this;

        self.$input.value = startingChar;
        self.$suggestions.innerHTML = '';
        self.$suggestions.style.display = 'none';
        self.$popup.style.display = 'block';
        self.$blocker.style.display = 'block';

        // Focusing on text input right away does not work for some reason.
        setTimeout(function() {
            editor.blur();
            self.$input.focus();
        }, 100);
    },

    hide: function() {
        var self = this;
        self.$popup.style.display = 'none';
        self.$blocker.style.display = 'none';
        editor.focus();
    }
}

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
    $settingsPopup = document.querySelector('.popup.settings');

    var vim = require("ace/keyboard/vim").handler;
    editor.setKeyboardHandler(vim);

    updateSize();

    window.onresize = function(event) {
        updateSize();
    }

    loadFiles();

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

    document.querySelector('.popup .close').addEventListener('click', function(event) {
        togglePopup($settingsPopup);
    });

    document.querySelector('.popup.settings input[type=submit]').addEventListener('click', function(event) {
    });

    document.querySelector('#blocker').addEventListener('click', function(event) {
        togglePopup($settingsPopup);
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

    document.querySelector('#top .settings').addEventListener('click', function(event) {
        if (localStorage.ignored_extensions) {
            document.querySelector('.popup.settings input.ignored_extensions').value = JSON.parse(localStorage.ignored_extensions).join(',');
        }
        togglePopup($settingsPopup);
    });

    document.querySelector('.popup.settings input[type=submit]').addEventListener('click', function(event) {
        try {
            var value = document.querySelector('.popup.settings input.ignored_extensions').value;
            var ignoredExtensions = [];
            value.split(',').forEach(function(ext, i) {
                if (ext.length) {
                    if (ext[0] !== '.') {
                        ext = '.' + ext;
                    }
                    ignoredExtensions.push(ext)
                }
            });
            localStorage.ignored_extensions = JSON.stringify(ignoredExtensions);
            togglePopup($settingsPopup);
        } catch (e) {
            alert(e);
        }
    });
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

function togglePopup($popup) {
    var $blocker = document.querySelector('#blocker');

    if ($popup.style.display === 'none') {
        $popup.style.display = 'block';
        $blocker.style.display = 'block';
    } else {
        $popup.style.display = 'none';
        $blocker.style.display = 'none';
        editor.focus();
    }
}
