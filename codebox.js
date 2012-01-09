var editor;
var editorElement;
var trie = {};

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
    return editor.getSelection().doc.$lines.join('\n');
}

function getCurrentlySelectedFileName() {
    return document.querySelector('#files .selected').innerHTML;
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
    editorElement = document.getElementById('editor');
    getFiles();

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

    document.querySelector('#files input').addEventListener('keyup', function(event) {
        var i = 0;
        var suggestions = getAutoSuggestions(this.value);

        document.querySelector('#files .suggestions').innerHTML = '';

        if (this.value.length) {
            var fragment = document.createDocumentFragment();
            suggestions.forEach(function(file, i) {
                var li = createFileListView(file);
                fragment.appendChild(li);
            });
            document.querySelector('#files .nav').style.display = 'none';
            document.querySelector('#files .suggestions').appendChild(fragment);
            dotcument.querySelector('#files .suggestions').style.display = 'block';
        } else {
            document.querySelector('#files .nav').style.display = 'block';
            document.querySelector('#files .suggestions').style.display = 'none';
        }
    });
};

function fileClicked() {
    var previouslySelectedFile = document.querySelector('.files .selected');
    if (previouslySelectedFile) {
        previouslySelectedFile.setAttribute('class', '');
    }

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

    this.setAttribute('class', 'selected');
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
            document.querySelector('#files ul').appendChild(fragment);
        }
    };

    xhr.send();
}

function grep(q) {
    var xhr = new XMLHttpRequest();
    var $ul = document.querySelector('#grep-popup ul');
    $ul.innerHTML = '';

    xhr.open("GET", '/grep?q=' + encodeURIComponent(q));

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            var json = JSON.parse(xhr.responseText);
            var fragment = document.createDocumentFragment();
            json.forEach(function(file, i) {
                var li = createFileListView(file.filename);
                fragment.appendChild(li);
                console.log(file);
            });
            $ul.appendChild(fragment);
        }
    };

    xhr.send();
}
