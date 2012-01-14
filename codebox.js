var editor;
var session;
var editorElement;
var trie = {};
var pendingGrep = null;
var grepIsRunning = false;

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
    new Mode("javascript", "JavaScript", require("ace/mode/javascript").Mode, ["js"]),
    new Mode("json", "JSON", require("ace/mode/json").Mode, ["json"]),
    new Mode("python", "Python", require("ace/mode/python").Mode, ["py"]),
    new Mode("php", "PHP",require("ace/mode/php").Mode, ["php"]),
    new Mode("text", "Text", require("ace/mode/text").Mode, ["txt"])
];

function getLinesInCurrentBuffer() {
    return session.getValue();
}

function getCurrentlySelectedFileName() {
    return document.querySelector('#sidebar .files .selected').innerHTML;
}

function save(fileName, lines) {
    var xhr = new XMLHttpRequest();
    var url = '/save';
    var params = 'file=' + fileName + '&lines=' + encodeURIComponent(lines);
    xhr.open("POST", url);
    document.querySelector('#notification').style.visibility = 'visible';

    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            document.querySelector('#notification').style.visibility = 'hidden';
            console.log(xhr.responseText);
        }
    };

    xhr.send(params);
}

window.onload = function() {
    editor = ace.edit("editor");
    session = editor.getSession();
    editorElement = document.getElementById('editor');

    getFiles();
    loadTopMenu();

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

    function togglePopup() {
        var $popup = document.querySelector('#grep-popup');
        var $blocker = document.querySelector('#blocker');

        if ($popup.style.display === 'none') {
            $popup.style.display = 'block';
            $blocker.style.display = 'block';
        } else {
            $popup.style.display = 'none';
            $blocker.style.display = 'none';
        }
    }

    function onTabClick(tabElem) {
        var paneClass = tabElem.getAttribute('rel');
        var oldTab = document.querySelector('#sidebar .tab.selected');
        var oldPane = document.querySelector('#sidebar .pane.selected');
        var newPane = document.querySelector('#sidebar .pane.' + paneClass);

        removeClass(oldTab, 'selected');
        removeClass(oldPane, 'selected');

        addClass(tabElem, 'selected');
        addClass(newPane, 'selected');
    }

    var tabs = document.querySelectorAll('#sidebar .tabs li');
    for (var i = 0; i < tabs.length; i += 1) {
        tabs[i].addEventListener('click', function(event) {
            onTabClick(this);
        });
    }
    onTabClick(tabs[0]);

    document.querySelector('#grep-popup .close').addEventListener('click', function(event) {
        togglePopup();
    });

    document.querySelector('#grep-popup input[type=submit]').addEventListener('click', function(event) {
        grep(document.querySelector('#grep-popup input[type=search]').value);
    });

    document.querySelector('#blocker').addEventListener('click', function(event) {
        togglePopup();
    });

    editor.commands.addCommand({
        name: "grep",
        bindKey: {
            win: "Ctrl-G",
            mac: "Command-G",
            sender: "editor"
        },
        exec: function() {
            togglePopup();
        }
    });

    document.querySelector('#sidebar .files input').addEventListener('keyup', function(event) {
        var i = 0;
        var suggestions = getAutoSuggestions(this.value);

        document.querySelector('#sidebar .files .suggestions').innerHTML = '';

        if (this.value.length) {
            var fragment = document.createDocumentFragment();
            suggestions.forEach(function(file, i) {
                var li = createFileListView(file);
                fragment.appendChild(li);
            });
            document.querySelector('#sidebar .files .nav').style.display = 'none';
            document.querySelector('#sidebar .files .suggestions').appendChild(fragment);
            document.querySelector('#sidebar .files .suggestions').style.display = 'block';
        } else {
            document.querySelector('#sidebar .files .nav').style.display = 'block';
            document.querySelector('#sidebar .files .suggestions').style.display = 'none';
        }
    });

    document.querySelector('#sidebar .grep input').addEventListener('keyup', function(event) {
        document.querySelector('#sidebar .grep .result').innerHTML = '';

        pendingGrep = this.value;
        if (!grepIsRunning) {
            grep();
        }
    });

    document.querySelector('#top select.branch').addEventListener('change', function(event) {
        changeBranch(this.value);
    });
};

function fileClicked() {
    removeClass(document.querySelector('.filelist .selected'), 'selected');

    var xhr = new XMLHttpRequest();
    var filename = this.innerHTML;
    var url = '/project/' + filename;
    xhr.open("GET", url);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            editor.getSelection().selectAll();
            editor.onTextInput(xhr.responseText);

            var mode = modes[0];
            for (var i = 0; i < modes.length; i++) {
                if (modes[i].supportsFile(filename)) {
                    mode = modes[i];
                    break;
                }
            }
            editor.getSession().setMode(mode.mode);
        }
    };
    xhr.send();

    addClass(this, 'selected');
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

function createFileListView(file) {
    var li = document.createElement('li');
    li.innerHTML = file;
    li.setAttribute('title', file);
    li.onclick = fileClicked;
    return li;
}

function createBranchSelectOption(branch) {
    var option = document.createElement('option');
    option.innerHTML = branch.title;
    if (branch.selected) {
        option.setAttribute('selected', 'selected');
    }
    return option;
}

function getFiles() {
    var xhr = new XMLHttpRequest();

    // Configure ignored extensions with:
    // localStorage.ignored_extensions = JSON.stringify(['.pyc', '.png']);
    var ignoredExtensions = JSON.parse(localStorage.ignored_extensions || '[]');

    xhr.open("GET", '/files?ignored_extensions=' + ignoredExtensions.join(','));

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            var json = JSON.parse(xhr.responseText);
            var fragment = document.createDocumentFragment();
            json.forEach(function(file, i) {
                var li = createFileListView(file);
                fragment.appendChild(li);
                makeAutoSuggestable(file);
            });
            document.querySelector('#sidebar .pane.files .nav').appendChild(fragment);
        }
    };

    xhr.send();
}

function grep() {
    var q = pendingGrep;
    var xhr = new XMLHttpRequest();
    var $ul = document.querySelector('#sidebar .grep .filelist');
    $ul.innerHTML = '';

    if (!q) {
        return;
    }

    pendingGrep = null;
    grepIsRunning = true;

    xhr.open("GET", '/grep?q=' + encodeURIComponent(q));

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            try {
                var json = JSON.parse(xhr.responseText);
            } catch (e) {
                console.log('Couldn not parse grep response');
                return;
            }

            var fragment = document.createDocumentFragment();
            json.forEach(function(file, i) {
                var li = createFileListView(file.filename);
                fragment.appendChild(li);
            });
            $ul.appendChild(fragment);

            grepIsRunning = false;
            if (pendingGrep !== null) {
                grep();
            }
        }
    };

    xhr.send();
}

function loadTopMenu() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", '/info');

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            var json;
            try {
                json = JSON.parse(xhr.responseText);
            } catch (e) {
                console.log('Couldn not parse info response');
                return;
            }

            var fragment = document.createDocumentFragment();
            json.branches.forEach(function(branch, i) {
                var option = createBranchSelectOption(branch);
                fragment.appendChild(option);
            });
            document.querySelector('#top select.branch').appendChild(fragment);

            document.querySelector('#top h1').innerHTML = json.path;
        }
    };

    xhr.send();
}

function changeBranch(branch) {
    var xhr = new XMLHttpRequest();
    var params = 'branch=' + branch;
    xhr.open("POST", '/branch');

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            console.log(xhr.responseText);
            location.reload();
        }
    };

    xhr.send(params);
}
