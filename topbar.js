var TopBar = {
    $view: null,
    $title: null,
    $type: null,
    $closeButton: null,

    init: function() {
        var self = this;

        self.$view = document.querySelector('#top');
        self.$closeButton = self.$view.querySelector('.close-button');
        self.$title = self.$view.querySelector('.title');
        self.$type = self.$view.querySelector('.type');

        self.$closeButton.onclick = function() {
            window.close();
        }
    },

    updateView: function(file) {
        var self = this;
        self.$title.innerHTML = file.name;
        if (file instanceof RemoteFile) {
            self.$type.innerHTML = HOST;
        } else {
            self.$type.innerHTML = '';
            file.getDisplayPath(function(path) {
                self.$type.innerHTML = path;
            });
        }
    }
}
