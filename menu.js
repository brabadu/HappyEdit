var Menu = {
    $popup: null,
    $blocker: null,
    
    init: function() {
        var self = this;
        
        self.$popup = document.querySelector('.popup.menu');
        self.$blocker = document.querySelector('.blocker.menu');

        var $fragment = document.createDocumentFragment();
        for (var i = 0; i < COMMANDS.length; i += 1) {
            var command = COMMANDS[i];
            if (!command.title) {
                continue;
            }
            var $li = HTML.createMenuOption({
                title: command.title,
                className: command.name,
                shortcut: command.shortcut.mac,
                callback: command.callback
            });
            self.$popup.appendChild($li);
        }
        self.$popup.appendChild($fragment);
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
