var EditorFile = function(name, body) {
    this.name = name;
    this.session = new EditSession(body);
    this.session.setMode(getModeForFile(name));
    this.session.setUndoManager(new UndoManager());
};

EditorFile.prototype.getSession = function() {
    return this.session;
};

EditorFile.prototype.save = function() {
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