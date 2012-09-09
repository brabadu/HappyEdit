var Settings = {
    $popup: null,
    $blocker: null,
    
    init: function() {
        var self = this;
        
        self.$popup = document.querySelector('.popup.settings');
        self.$blocker = document.querySelector('#blocker');
    
        document.querySelector('#top .settings').addEventListener('click', function(event) {
            self.show();
        });
        
        self.$popup.querySelector('.close').addEventListener('click', function(event) {
            self.hide();
        });
    
        self.$popup.querySelector('input[type=submit]').addEventListener('click', function(event) {
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
                self.hide();
            } catch (e) {
                alert(e);
            }
        });
    },
    
    show: function() {
        var self = this;

        if (localStorage.ignored_extensions) {
            document.querySelector('.popup.settings input.ignored_extensions').value = JSON.parse(localStorage.ignored_extensions).join(',');
        }

        self.$blocker.onclick = function() {
            self.hide();
        };

        self.$popup.style.display = 'block';
        self.$blocker.style.display = 'block';

        // Focusing on text input right away does not work for some reason.
        setTimeout(function() {
            editor.blur();
        }, 100);
    },
    
    hide: function() {
        var self = this;
        self.$popup.style.display = 'none';
        self.$blocker.style.display = 'none';
        editor.focus();
    }
};