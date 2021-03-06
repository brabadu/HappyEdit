var files = {};
var editor;
var editorElement;
var currentFile;

window.onkeydown = function(event) {
    if (!CommandLine.isVisible() && !Settings.isVisible()) {
        window.editor.focus();
    }
};

function updateSize() {
    var w = window.innerWidth;
    var h = window.innerHeight - document.querySelector('#top').offsetHeight;

    editorElement.style.width = w + 'px';
    editorElement.style.height = h + 'px';
}

COMMANDS = [
    {
        name: "openFile",
        title: "Open Local File",
        shortcut: {
            win: "Ctrl-O",
            mac: "Command-O",
        },
        callback: function() {
            openLocalFile();
        }
    },
    {
        name: "commandT",
        title: "Open Remote File",
        shortcut: {
            win: "Ctrl-T",
            mac: "Command-T",
        },
        callback: function() {
            CommandLine.show('');
        }
    },
    {
        name: "save",
        title: "Save",
        shortcut: {
            win: "Ctrl-S",
            mac: "Command-S",
        },
        callback: function() {
            window.currentFile.save();
        }
    },
    {
        name: "nextTab",
        shortcut: {
            win: "Ctrl-Tab",
            mac: "Command-Shift-]",
        },
        callback: function() {
            TopBar.nextTab();
        }
    },
    {
        name: "prevTab",
        shortcut: {
            win: "Ctrl-Shift-Tab",
            mac: "Command-Shift-[",
        },
        callback: function() {
            TopBar.prevTab();
        }
    },
    {
        name: "closeFile",
        shortcut: {
            win: "Ctrl-W",
            mac: "Command-W",
        },
        callback: function() {
            closeFile(window.currentFile);
        }
    }
];

window.onload = function() {
    editor = ace.edit("editor");
    editorElement = document.getElementById('editor');

    CommandLine.init();
    Settings.init();
    Menu.init();
    TopBar.init();
    ProjectFiles.init();

    window.onresize = function(event) {
        updateSize();
    }

    updateSize();

    editor.setKeyboardHandler(require("ace/keyboard/vim").handler);
    editor.setAnimatedScroll(true);

    for (var i = 0; i < COMMANDS.length; i += 1) {
        var command = COMMANDS[i];
        editor.commands.addCommand({
            name: command.name,
            bindKey: {
                win: command.shortcut.win,
                mac: command.shortcut.mac,
                sender: "editor"
            },
            exec: command.callback
        });
    }

    for (var i = 1; i < 10; i += 1) {
        (function() {
            var keyNum = i;
            editor.commands.addCommand({
                name: "selectTab" + i,
                bindKey: {
                    win: "Ctrl-" + keyNum,
                    mac: "Command-" + keyNum,
                    sender: "editor"
                },
                exec: function() {
                    var tabIndex = keyNum;
                    if (tabIndex > TopBar.tabs.length) {
                        tabIndex = TopBar.tabs.length;
                    }
                    tabIndex -= 1;
                    TopBar.selectTabAtIndex(tabIndex);
                }
            });
        }());
    }

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

function switchToFile(file, updateTabs) {
    window.currentFile = file;
    window.editor.setSession(file.getSession());

    if (updateTabs || updateTabs === undefined) {
        TopBar.updateView(file);
    }
}

function getNumberOfOpenFiles() {
    return TopBar.tabs.length;
}

function closeFile(file) {
    if (getNumberOfOpenFiles() > 1) {
        var tab = TopBar.getTabForFile(file);
        tab.close(true);
        delete files[currentFile.name];
    } else {
        window.close();
    }
}

function getOrLoadRemoteFile(filename, callback) {
    if (window.files.hasOwnProperty(filename)) {
        callback(window.files[filename]);
        return;
    }

    var xhr = new XMLHttpRequest();
    var url = ProjectFiles.host + '/files/' + filename;
    xhr.open("GET", url);
    xhr.onreadystatechange = function() {
        var file;
        if (xhr.readyState == 4) {
            file = new RemoteFile(filename, xhr.responseText);
            files[filename] = file;
            callback(file);
        }
    };
    xhr.send();
}

function openRemoteFile(filename) {
    var file;

    getOrLoadRemoteFile(filename, function(file) {
        window.switchToFile(file);
    });
}

function openLocalFile() {
    chrome.fileSystem.chooseEntry(function(fileEntry) {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
            return;
        }
        fileEntry.file(function(f) {
            var reader = new FileReader();
            reader.onload = function() {
                var file;
                if (window.files.hasOwnProperty(fileEntry.name)) {
                    file = window.files[fileEntry.name];
                } else {
                    file = new LocalFile(fileEntry, reader.result);
                    files[fileEntry.name] = file;
                }
                window.switchToFile(file);
            };
            reader.readAsText(f);
        });
    });
}

