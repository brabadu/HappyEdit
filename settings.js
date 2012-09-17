var Settings = {
    $popup: null,
    $saveButton: null,
    $blocker: null,
    
    init: function() {
        var self = this;
        
        self.$popup = document.querySelector('.popup.settings');
        self.$blocker = document.querySelector('.blocker.settings');
        self.$saveButton = self.$popup.querySelector('input[type=submit]');

        self.$popup.querySelector('.close').addEventListener('click', function(event) {
            self.hide();
        });
    
        self.$saveButton.addEventListener('click', function(event) {
            var value = self.$popup.querySelector('input.ignored_extensions').value;
            var ignoredExtensions = [];
            value.split(',').forEach(function(ext, i) {
                if (ext.length) {
                    if (ext[0] !== '.') {
                        ext = '.' + ext;
                    }
                    ignoredExtensions.push(ext)
                }
            });
            Storage.set('ignored_extensions', ignoredExtensions);
            self.hide();
        });
    },

    isVisible: function() {
        return this.$popup.style.display === 'block';
    },

    show: function() {
        var self = this;

        self.$blocker.onclick = function() {
            self.hide();
        };

        self.$popup.style.display = 'block';
        self.$blocker.style.display = 'block';

        Storage.get('ignored_extensions', false, function(data) {
            if (data) {
                self.$popup.querySelector('input.ignored_extensions').value = data.join(',');
            }
        });

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