var EditSession = require('ace/edit_session').EditSession;

/**
 * AbstractFile
 */
function AbstractFile(name, body) {
    this.name = name;
    this.session = new EditSession(body);
    this.session.setMode(getModeForFile(name));
    this.session.setUndoManager(new UndoManager());
    this.getSession = function() {
        return this.session;
    };
};

/**
 * RemoteFile
 */
function RemoteFile(name, body) {
    AbstractFile.call(this, name, body);
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
function LocalFile(name, body) {
    AbstractFile.call(this, name, body);
};

LocalFile.prototype = new AbstractFile();
LocalFile.constructor = LocalFile;