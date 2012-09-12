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

        (function() {
            var timeout;
            window.onmousemove = function() {
                if (timeout) {
                    clearTimeout(timeout);
                }
                self.fadeIn();
                timeout = setTimeout(function() {
                    self.fadeOut();
                }, 2000);
            }
        }());

        self.$closeButton.onclick = function() {
            window.close();
        }
    },

    fadeIn: function() {
        addClass(this.$view, 'show-ui');
    },

    fadeOut: function() {
        removeClass(this.$view, 'show-ui');
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
