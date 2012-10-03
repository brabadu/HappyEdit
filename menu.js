var Menu = {
    $popup: null,
    $blocker: null,
    
    init: function() {
        var self = this;
        
        self.$popup = document.querySelector('.popup.menu');
        self.$blocker = document.querySelector('.blocker.menu');
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
};est
