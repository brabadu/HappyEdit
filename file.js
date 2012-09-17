var EditSession = require('ace/edit_session').EditSession;
var UndoManager = require('ace/undomanager').UndoManager;

var PATH_SEPARATOR = '/';

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
    new Mode("text", "Text", require("ace/mode/text").Mode, ["txt"]),
    new Mode("diff", "Diff", require("ace/mode/diff").Mode, ["diff"])
];

/**
 * AbstractFile
 */
function AbstractFile(name, body) {
    var self = this;

    this.getSession = function() {
        return this.session;
    };

    this.setDisplayPath = function(displayPath) {
        console.log('setDisplayPath called for ' + name);
        var split = displayPath.split(PATH_SEPARATOR);
        self.basename = split.pop();
        self.dirname = split.join(PATH_SEPARATOR);
        self.displayPath = displayPath;
    };

    this.getMode = function(filename) {
        var mode = window.modes[0];
        for (var i = 0; i < window.modes.length; i += 1) {
            if (modes[i].supportsFile(name)) {
                mode = modes[i];
                break;
            }
        }
        return mode.mode;
    }
    
    this.name = name;
    this.session = new EditSession(body || '');
    this.session.setMode(this.getMode(name));
    this.session.setUndoManager(new UndoManager());
    this.modified = false;
    this.basename = '';
    this.dirname = '';
    this.displayPath = '';

    this.session.getDocument().on('change', function(event) {
        self.modified = self.session.getUndoManager().$undoStack.length !== 0;
    });
};

/**
 * RemoteFile
 */
function RemoteFile(name, body) {
    AbstractFile.call(this, name, body);
    this.setDisplayPath(name);

    this.save = function() {
        var xhr = new XMLHttpRequest();
        var url = HOST + '/files/' + encodeURIComponent(this.name);
        var params = 'body=' + encodeURIComponent(this.session.getValue());

        xhr.open("POST", url);
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

        document.querySelector('#notification').style.visibility = 'visible';

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                document.querySelector('#notification').style.visibility = 'hidden';
                console.log(xhr.responseText);
                editor.getSession().getUndoManager().reset();
            }
        };

        xhr.send(params);
    };
};

RemoteFile.prototype = new AbstractFile();
RemoteFile.constructor = RemoteFile;

/**
 * LocalFile
 */
function LocalFile(fileEntry, body) {
    var self = this;

    AbstractFile.call(this, fileEntry.name, body);
    this.fileEntry = fileEntry;
    this.basename = fileEntry.name;

    chrome.fileSystem.getDisplayPath(fileEntry, this.setDisplayPath);

    this.save = function() {
        document.querySelector('#notification').style.visibility = 'visible';
        chrome.fileSystem.getWritableEntry(self.fileEntry, function(fileEntry) {
            fileEntry.createWriter(function(fileWriter) {
                fileWriter.onwriteend = function(e) {
                    document.querySelector('#notification').style.visibility = 'hidden';
                    console.log('writing ended');
                    if (this.error) {
                        console.log('Error during write: ' + this.error.toString(), this.error);
                    }
                };
                var blob = new Blob([self.session.getValue()], {type: 'text/plain'});
                fileWriter.write(blob);
            });
        });
    };
};

LocalFile.prototype = new AbstractFile();
LocalFile.constructor = LocalFile;
