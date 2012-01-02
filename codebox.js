var editor;
var editorElement;

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
};

function fileClicked() {
    var previouslySelectedFile = document.querySelector('#files .selected');
    if (previouslySelectedFile) {
        previouslySelectedFile.setAttribute('class', '');
    }

    var xhr = new XMLHttpRequest();
    var filename = this.innerHTML;
    var url = '/' + filename;
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

function getFiles() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", '/files');

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            var json = JSON.parse(xhr.responseText);
            var fragment = document.createDocumentFragment();
            json.forEach(function(file, i) {
                var li = document.createElement('li');
                li.innerHTML = file;
                li.onclick = fileClicked;
                fragment.appendChild(li);
            });
            document.getElementById('files').appendChild(fragment);
        }
    };

    xhr.send();
}

